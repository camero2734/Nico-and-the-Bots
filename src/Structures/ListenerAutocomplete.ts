/* eslint-disable @typescript-eslint/no-explicit-any */
import { Guild, GuildMember, Message, MessageComponentInteraction, Snowflake, TextChannel } from "discord.js";
import F from "../Helpers/funcs";

type RequiredDiscordValues = {
    member: GuildMember;
    guild: Guild;
    channel: TextChannel;
    guildId: Snowflake;
};

export type ListenerAutocomplete = MessageComponentInteraction & RequiredDiscordValues & { message: Message };

export const createAutocompleteListener = <T extends Readonly<string[]> = any>(name: string, args: T): void => {
    //
};
