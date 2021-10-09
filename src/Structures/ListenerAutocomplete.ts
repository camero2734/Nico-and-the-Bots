/* eslint-disable @typescript-eslint/no-explicit-any */
import { AutocompleteInteraction, Guild, GuildMember, Snowflake, TextChannel } from "discord.js";
import { ElementOf, PickKeys, PickProperties, Tuple, UnionToIntersection, ValueOf } from "ts-essentials";

type RequiredDiscordValues = {
    member: GuildMember;
    guild: Guild;
    channel: TextChannel;
    guildId: Snowflake;
};

type AutocompleteContext<OptsType> = AutocompleteInteraction &
    RequiredDiscordValues & {
        opts: OptsType;
        focused: keyof OptsType;
    };

export type AutocompleteListener<OptsType> = (ctx: AutocompleteContext<OptsType>) => Promise<void>;

interface IsAutocomplete {
    autocomplete: true;
    name: string;
}

export type AutocompleteNames<RawOptionsData extends Readonly<Tuple>> = {
    [Index in keyof RawOptionsData]: RawOptionsData[Index] extends IsAutocomplete
        ? RawOptionsData[Index]["name"]
        : never;
}[number];
