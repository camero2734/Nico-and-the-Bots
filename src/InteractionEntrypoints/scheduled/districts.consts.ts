import { Faker, en } from "@faker-js/faker";
import { startOfDay } from "date-fns";
import F from "../../Helpers/funcs";
import { channelIDs, roles } from "../../Configuration/config";
import { ChannelType, Role, TextChannel } from "discord.js";
import { guild } from "../../../app";
import { WebhookData, getDistrictWebhookClient } from "../../Helpers/district-webhooks";

export interface District {
    name: keyof typeof channelIDs["districts"];
    role: Role;
    channel: TextChannel;
    webhook: WebhookData;
    imageUrl: string;
}

export async function dailyDistrictOrder() {
    const faker = new Faker({ locale: [en] });
    faker.seed(startOfDay(new Date()).getTime());

    // Determine which districts face each other today
    // 0 -> 1 -> 2 -> 3 -> ... -> 8 -> 9 -> 0
    const ranDistricts = faker.helpers.shuffle(F.entries(channelIDs.districts));

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

    return districts;
}
