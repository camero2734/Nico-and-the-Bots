import { CommandOptionType } from "slash-create";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import * as R from "ramda";
import { channelIDs, roles } from "configuration/config";

const pronounOptsList = <const>["pronoun1", "pronoun2", "pronoun3"];
type OptsType = Record<typeof pronounOptsList[number], string>;

export const Options: CommandOptions = {
    description: "Overwrites all of your pronoun roles with up to three that you specify",
    options: pronounOptsList.map((name, i) => ({
        name,
        description: `Pronoun #${i + 1}`,
        required: i === 0,
        type: CommandOptionType.STRING,
        choices: [
            { name: "he/him", value: "724816436304019536" },
            { name: "she/her", value: "724816755809058826" },
            { name: "they/them", value: "724816785290821893" },
            { name: "I don't see mine", value: "notExist" }
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

    pronounRoles = pronounRoles.filter((p) => p !== "notExist"); // Ignore this one

    if (pronounRoles.length === 0) return;

    // Remove any pronoun roles not mentioned
    const toRemove = R.difference(Object.values(roles.pronouns), pronounRoles);
    for (const role of toRemove) {
        await ctx.member.roles.remove(role);
        await new Promise((next) => setTimeout(next, 600));
    }

    // Give the pronoun roles mentioned
    for (const role of pronounRoles) {
        await ctx.member.roles.add(role);
        await new Promise((next) => setTimeout(next, 600));
    }

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.user.avatarURL)
        .setDescription(`Your pronoun roles have been updated!`);

    await ctx.embed(embed);
};
