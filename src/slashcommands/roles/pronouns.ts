import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import * as R from "ramda";
import { channelIDs, roles } from "configuration/config";

const pronounOptsList = <const>["pronoun1", "pronoun2", "pronoun3"];
type OptsType = Record<typeof pronounOptsList[number], string>;

const pronounRoles = roles.pronouns;

export const Options: CommandOptions = {
    description: "Overwrites all of your pronoun roles with up to three that you specify",
    options: pronounOptsList.map((name, i) => ({
        name,
        description: `Pronoun #${i + 1}`,
        required: i === 0,
        type: CommandOptionType.STRING,
        choices: [
            ...Object.entries(pronounRoles).map(([name, value]) => ({ name, value })),
            { name: "I'd like to suggest a pronoun be added to the list", value: "notExist" }
        ]
    }))
};

export const Executor: CommandRunner<OptsType> = async (ctx) => {
    let pronounRoles = pronounOptsList.map((p) => ctx.opts[p]).filter((p) => p);

    if (pronounRoles.some(R.equals("notExist"))) {
        const embed = new MessageEmbed()
            .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
            .setDescription(`You can suggest a pronoun role that doesn't exist yet in <#${channelIDs.suggestions}>!`);
        ctx.embed(embed);
    }

    pronounRoles = pronounRoles.filter((p) => p !== "notExist") as Snowflake[]; // Ignore this one

    if (pronounRoles.length === 0) return;

    // Remove any pronoun roles not mentioned
    const toRemove = R.difference(Object.values(roles.pronouns), pronounRoles) as Snowflake[];
    for (const r of toRemove) await ctx.member.roles.remove(r);

    // Give the pronoun roles mentioned
    for (const r of pronounRoles as Snowflake[]) await ctx.member.roles.add(r);

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
        .setDescription(`Your pronoun roles have been updated!`);

    await ctx.embed(embed);
};
