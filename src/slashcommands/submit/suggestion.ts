import { channelIDs } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import Discord, { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { generateUpvoteDownvoteListener } from "helpers";
import F from "helpers/funcs";
import { last } from "ramda";
import { CommandOptionType, ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Submits a suggestion to the staff",
    options: [
        { name: "title", description: "The title of your suggestion", required: true, type: CommandOptionType.STRING },
        {
            name: "details",
            description: "Some more details about your suggestion",
            required: true,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ title: string; details: string }> = async (ctx) => {
    const { title, details } = ctx.opts;

    const embed = new MessageEmbed()
        .setAuthor(`Suggestion from ${ctx.member.displayName}`, ctx.member.user.displayAvatarURL())
        .setColor(ctx.member.displayColor)
        .setTitle(title)
        .setDescription(details);

    const suggestChan = ctx.member.guild.channels.cache.get(channelIDs.submittedsuggestions) as TextChannel;

    await suggestChan.send({ embeds: [embed] });

    const responseEmbed = new MessageEmbed({ description: "Your suggestion has been submitted!" });
    await ctx.send({ embeds: [responseEmbed.toJSON()] });
};
