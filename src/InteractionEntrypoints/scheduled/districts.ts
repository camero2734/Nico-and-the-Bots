import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Role, TextChannel, roleMention } from "discord.js";
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

    for (let i = 0; i < districts.length; i++) {
        const prevDistrict = districts.at(i - 1)!;
        const district = districts[i];
        const nextDistrict = districts[(i + 1) % districts.length];

        const webhook = await getDistrictWebhookClient(district.name, district.channel);

        const embed = new EmbedBuilder()
            .setTitle(`${district.role.name} Morning Report`)
            .setColor(district.role.color)
            .setDescription(`Good morning, citizens of ${roleMention(district.role.id)}. Please ensure you safely hide your valuables before leaving your homes. The raiding party from ${roleMention(prevDistrict.role.id)} will be arriving today.`)
            .addFields([
                { name: "Raiding", value: roleMention(nextDistrict.role.id), inline: true },
                { name: "Defending", value: roleMention(prevDistrict.role.id), inline: true },
            ]);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .setComponents(["I", "II", "III", "IV"].map(qtr =>
                new ButtonBuilder()
                    .setLabel(`QTR ${qtr}`)
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`placeholder${qtr}`)
            ));

        await webhook.client.send({ embeds: [embed], components: [actionRow] });
    }
}

export default entrypoint;
