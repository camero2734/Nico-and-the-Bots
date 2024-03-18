import { Faker, en } from "@faker-js/faker";
import { ChannelType, Role, TextChannel } from "discord.js";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { WebhookData, getDistrictWebhookClient } from "../../Helpers/district-webhooks";
import F from "../../Helpers/funcs";
import { BishopType } from "@prisma/client";

export interface District {
    name: keyof typeof channelIDs["districts"];
    bishopType: BishopType;
    role: Role;
    channel: TextChannel;
    webhook: WebhookData;
    imageUrl: string;
}

export async function dailyDistrictOrder(battleId: number) {
    const faker = new Faker({ locale: [en] });
    faker.seed(F.hashToInt(`dist.battle.${battleId}`));

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
            const bishopType = F.capitalize(name) as BishopType;

            return {
                name,
                bishopType,
                role,
                channel,
                webhook,
                imageUrl
            };
        })
    );

    return districts;
}
