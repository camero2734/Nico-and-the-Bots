import { ActionRowBuilder, ChannelType, EmbedBuilder, Role, StringSelectMenuBuilder, TextChannel, roleMention } from "discord.js";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { getDistrictWebhookClient } from "../../Helpers/district-webhooks";
import F from "../../Helpers/funcs";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

const entrypoint = new ManualEntrypoint();

// const cron = Cron("0 17 * * *", { timezone: "Europe/Amsterdam" }, districtCron);

interface District {
    name: keyof typeof channelIDs["districts"];
    role: Role;
    channel: TextChannel;
}

export async function districtCron() {
    // Determine which districts face each other today
    // 0 -> 1 -> 2 -> 3 -> ... -> 8 -> 9 -> 0
    const ranDistricts = F.shuffle(F.entries(channelIDs.districts));

    const districts: District[] = await Promise.all(
        ranDistricts.map(async ([name, channelId]) => {
            const roleId = roles.districts[name];
            const role = await guild.roles.fetch(roleId);
            const channel = await guild.channels.fetch(channelId);
            if (!role || !channel || channel.type !== ChannelType.GuildText) {
                throw new Error(`Role or channel not found for ${name}`);
            }

            return {
                name,
                role,
                channel
            };
        })
    );

    for (let i = 0; i < 1; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];
        const nextDistrict = districts[(i + 1) % districts.length];

        const webhook = await getDistrictWebhookClient(district.name, district.channel);

        // This will probably be randomized per day
        const currencyAmount = 50;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Announcement from ${district.name.toUpperCase()}`, iconURL: webhook.webhook.avatarURL({ size: 512, extension: "png" })! })
            .setColor(district.role.color)
            .setDescription(`Good morning, my faithful citizens. Today, I bestow upon you a blessing of **Ƌ${currencyAmount}** in credits.\n\nHowever, you must remain vigilant. Rumors have reached my ear that a raiding party from ${roleMention(prevDistrict.role.id)} intends to test our resolve and seize our riches from us today; ensure those credits are wisely hidden among the four quarters of our district.\n\nIn reciprocity, I have deemed that the wealth harbored within ${roleMention(nextDistrict.role.id)} would better serve the Sacred Municipality of Dema under my stewardship. Thus, we shall embark on a raid upon one of their quarters at nightfall.\n\nGlory to Dema.`)
            .addFields([
                { name: "Raiding", value: roleMention(nextDistrict.role.id), inline: true },
                { name: "Defending", value: roleMention(prevDistrict.role.id), inline: true },
            ]);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(genQtrId({}))
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder("Vote for a quarter to hide the credits in")
            .setOptions([
                { label: "QTR I", value: "0" },
                { label: "QTR II", value: "1" },
                { label: "QTR III", value: "2" },
                { label: "QTR IV", value: "3" },
            ]);

        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(selectMenu);

        await webhook.client.send({ embeds: [embed], components: [actionRow] });
    }
}

const genQtrId = entrypoint.addInteractionListener("districtQtrSel", [], async (ctx) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferReply({ ephemeral: true });

    const qtrIndex = parseInt(ctx.values[0]);

    await ctx.editReply(`You selected QTR ${["I", "II", "III", "IV"][qtrIndex]}`);
});

export default entrypoint;
