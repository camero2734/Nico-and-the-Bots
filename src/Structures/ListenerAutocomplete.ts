/* eslint-disable @typescript-eslint/no-explicit-any */
import { AutocompleteInteraction, Guild, GuildMember, Snowflake, TextChannel } from "discord.js";

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

// export const createAutocompleteListener = <OptsType extends Record<string, any>>(
//     name: string,
//     handler: AutocompleteListener<OptsType>
// ): void => {
//     //
// };
