import { ActionRowBuilder, ChannelType, EmbedBuilder, Role, StringSelectMenuBuilder, TextChannel, roleMention } from "discord.js";
import { guild } from "../../../app";
import { channelIDs, emojiIDs, roles } from "../../Configuration/config";
import { WebhookData, getDistrictWebhookClient } from "../../Helpers/district-webhooks";
import F from "../../Helpers/funcs";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";

const entrypoint = new ManualEntrypoint();

// const cron = Cron("0 17 * * *", { timezone: "Europe/Amsterdam" }, districtCron);

interface District {
    name: keyof typeof channelIDs["districts"];
    role: Role;
    channel: TextChannel;
    webhook: WebhookData;
    imageUrl: string;
}

const emoji = (id: string) => `<:emoji:${id}>`;

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

            const webhook = await getDistrictWebhookClient(name, channel);
            const imageUrl = webhook.webhook.avatarURL({ size: 512, extension: "png" })!;

            return {
                name,
                role,
                channel,
                webhook,
                imageUrl
            };
        })
    );

    for (let i = 0; i < 1; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];
        const nextDistrict = districts[(i + 1) % districts.length];

        // This will probably be randomized per day
        const currencyAmount = 50;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Announcement from ${district.name.toUpperCase()}`, iconURL: district.imageUrl })
            .setTitle("024 03MOON 18")
            .setColor(district.role.color)
            .setDescription(`Good morning, my faithful citizens. Today, I bestow upon you a blessing of **ↁ${currencyAmount}** in credits. (Results from yesterday)`)
            .setFooter({ text: "See the pinned message in #glorious-vista for how to play" });

        const defendingEmbed = new EmbedBuilder()
            .setAuthor({ name: `Being raided by ${prevDistrict.name.toUpperCase()}`, iconURL: prevDistrict.imageUrl })
            .setDescription(`Rumors have reached my ear that a raiding party from ${roleMention(prevDistrict.role.id)} intends to test our resolve and seize our riches from us today; ensure those credits are wisely hidden among the four quarters of our district.`)
            .addFields([
                { name: emoji(emojiIDs.quarters.i), value: "15 votes", inline: true },
                { name: emoji(emojiIDs.quarters.ii), value: "46 votes", inline: true },
                { name: emoji(emojiIDs.quarters.iii), value: "9 votes", inline: true },
                { name: emoji(emojiIDs.quarters.iv), value: "65 votes", inline: true },
            ]);

        const attackingEmbed = new EmbedBuilder()
            .setAuthor({ name: `Attacking ${nextDistrict.name.toUpperCase()}`, iconURL: nextDistrict.imageUrl })
            .setDescription(`In reciprocity, I have deemed that the wealth harbored within ${roleMention(nextDistrict.role.id)} would better serve the Sacred Municipality of Dema under my stewardship. Thus, we shall embark on a raid upon one of their quarters at nightfall.`)
            .addFields([
                { name: emoji(emojiIDs.quarters.i), value: "20 votes ⇒ **ↁ10**", inline: true },
                { name: emoji(emojiIDs.quarters.ii), value: "62 votes ⇒ **ↁ31**", inline: true },
                { name: emoji(emojiIDs.quarters.iii), value: "7 votes ⇒ **ↁ4**", inline: true },
                { name: emoji(emojiIDs.quarters.iv), value: "10 votes ⇒ **ↁ5**", inline: true },
            ]);

        const defendingMenu = new StringSelectMenuBuilder()
            .setCustomId(genQtrId({}))
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`Pick a QTR to hide credits from ${prevDistrict.role.name.toUpperCase()}`)
            .setOptions([
                { label: "QTR I", value: "0", emoji: { id: emojiIDs.quarters.i } },
                { label: "QTR II", value: "1", emoji: { id: emojiIDs.quarters.ii } },
                { label: "QTR III", value: "2", emoji: { id: emojiIDs.quarters.iii } },
                { label: "QTR IV", value: "3", emoji: { id: emojiIDs.quarters.iv } }
            ]);

        const attackingMenu = new StringSelectMenuBuilder()
            .setCustomId(genQtrId({}) + "2")
            .setMaxValues(1)
            .setMinValues(1)
            .setPlaceholder(`Pick a QTR to search in ${nextDistrict.role.name.toUpperCase()}`)
            .setOptions([
                { label: "QTR I", value: "0", emoji: { id: emojiIDs.quarters.i } },
                { label: "QTR II", value: "1", emoji: { id: emojiIDs.quarters.ii } },
                { label: "QTR III", value: "2", emoji: { id: emojiIDs.quarters.iii } },
                { label: "QTR IV", value: "3", emoji: { id: emojiIDs.quarters.iv } }
            ]);

        const defendingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(defendingMenu);
        const attackingActionRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(attackingMenu);

        await district.webhook.client.send({ embeds: [embed, defendingEmbed, attackingEmbed], components: [defendingActionRow, attackingActionRow], allowedMentions: { parse: [] } });
    }
}

const genQtrId = entrypoint.addInteractionListener("districtQtrSel", [], async (ctx) => {
    if (!ctx.isStringSelectMenu()) return;
    await ctx.deferReply({ ephemeral: true });

    const qtrIndex = parseInt(ctx.values[0]);

    const emojiId = Object.values(emojiIDs.quarters)[qtrIndex];

    await ctx.editReply(`You selected ${emoji(emojiId)} QTR ${["I", "II", "III", "IV"][qtrIndex]}`);
});

export default entrypoint;
