import { ActionRow, EmbedBuilder, Guild, Role, SelectMenuComponent, SelectMenuOption } from "discord.js";
import R from "ramda";
import { roles } from "../../../Configuration/config";
import { getConcertChannelManager } from "../../../Helpers/concert-channels";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Selects a concert channel",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const concertsByCountry = getConcertsByCountry(ctx.guild);

    const countries = Object.keys(concertsByCountry).map((k) => ({ name: k, count: concertsByCountry[k].length }));
    const countrySelectMenu = new SelectMenuComponent()
        .addOptions(
            ...countries.map(
                (c) =>
                    new SelectMenuOption({
                        label: F.titleCase(c.name.split("-").join(" ")),
                        value: c.name,
                        description: `${c.count} concert${F.plural(c.count)}`
                    })
            )
        )
        .setPlaceholder("Select a country")
        .setCustomId(genSelectCountryId({}));
    const temporaryConcertSelectMenu = new SelectMenuComponent()
        .addOptions(new SelectMenuOption({ label: "Dummy option", value: "Dummy value", description: "Dummy" }))
        .setPlaceholder("❌ Select a country first")
        .setDisabled(true)
        .setCustomId("selectConcert");

    const countryActionRow = new ActionRow().setComponents(countrySelectMenu);
    const concertActionRow = new ActionRow().setComponents(temporaryConcertSelectMenu);

    const embed = new EmbedBuilder()
        .setTitle("🧙 Concert Selection Wizard")
        .setDescription(
            "Please select your country below, and then the concert(s) you wish to attend. Selecting a concert that you already have will remove it."
        );

    await ctx.send({ embeds: [embed], components: [countryActionRow, concertActionRow] });
});

const genSelectCountryId = command.addInteractionListener("selectCountry", <const>[], async (ctx) => {
    if (!ctx.isSelectMenu()) return;

    const [countryActionRow, concertActionRow] = ctx.message.components;

    const concertsByCountry = getConcertsByCountry(ctx.guild);
    const country = ctx.values[0];
    const concerts = concertsByCountry[country];

    if (!concerts) throw new Error("Invalid country");

    const concertSelectMenu = new SelectMenuComponent()
        .addOptions(
            ...concerts.map(
                (c) =>
                    new SelectMenuOption({
                        label: c.name,
                        value: c.concert.id,
                        description: c.concert.venue.location
                    })
            )
        )
        .setPlaceholder("Select some concert(s)")
        .setMaxValues(concerts.length)
        .setCustomId(genSelectConcertId({ country }));

    console.log(concertActionRow);

    concertActionRow.components.splice(0, 1);
    concertActionRow.addComponents(concertSelectMenu);

    // Update placeholder of first select menu to reflect country choice
    const placeholder = `${F.titleCase(country.split("-").join(" "))} selected`;
    (countryActionRow.components[0] as SelectMenuComponent).setPlaceholder(placeholder);

    await ctx.update({ components: ctx.message.components });
});

const genSelectConcertId = command.addInteractionListener("selectConcert", <const>["country"], async (ctx, args) => {
    if (!ctx.isSelectMenu()) return;

    const concertsByCountry = getConcertsByCountry(ctx.guild);
    const country = args.country;
    const concertIds = ctx.values;

    const countryConcerts = concertsByCountry[country];
    const concerts = concertIds.map(id => countryConcerts?.find((c) => c.concert.id === id)) as typeof countryConcerts; // prettier-ignore
    if (concerts.some((c) => c === undefined)) throw new Error("Invalid concert");

    const rolesToGive = (await Promise.all(concerts.map((c) => c.getAssociatedRole()))) as Role[];
    if (rolesToGive.some((c) => c === undefined)) throw new Error("Invalid concert");

    const userHasRole = (role: Role) => ctx.member.roles.cache.has(role.id);
    const [toRemove, toAdd] = R.partition(userHasRole, rolesToGive);

    await ctx.member.roles.remove(toRemove);
    await ctx.member.roles.add(toAdd);

    const gave = toAdd.length > 0 && `✨ I added these concert roles: ${toAdd.map((r) => `${r}`).join(" ")}`;
    const removed = toRemove.length > 0 && `✨ I removed these concert roles: ${toRemove.map((r) => `${r}`).join(" ")}`;

    const description = [gave, removed].filter((s) => s).join("\n\n");

    const embed = new EmbedBuilder().setTitle("🧙 Concert Selection Wizard").setDescription(description);

    await ctx.update({ embeds: [embed], components: [] });
});

function getConcertsByCountry(guild: Guild) {
    const concertManager = getConcertChannelManager(guild);

    const concertsByCountry: Record<string, typeof concertManager["concertChannels"]> = {};

    for (const concert of concertManager.concertChannels) {
        const { country } = concert;
        if (!concertsByCountry[country]) concertsByCountry[country] = [];
        concertsByCountry[country].push(concert);
    }

    return concertsByCountry;
}

command.addPermission(roles.banditos, true);

export default command;
