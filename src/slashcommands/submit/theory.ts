import { channelIDs } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import { EmojiIdentifierResolvable, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { generateUpvoteDownvoteListener } from "helpers";
import { CommandOptionType, ComponentActionRow } from "slash-create";

export const Options: CommandOptions = {
    description: "Submits a theory to #theory-list",
    options: [
        { name: "title", description: "The title of your theory", required: true, type: CommandOptionType.STRING },
        { name: "theory", description: "Your theory in text form", required: true, type: CommandOptionType.STRING },
        {
            name: "imageurl",
            description: "A direct link to a supporting image",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
};

const answerListener = generateUpvoteDownvoteListener("theoryResponse");
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner<{ title: string; theory: string; imageurl?: string }> = async (ctx) => {
    const { title, theory, imageurl } = ctx.opts;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .setColor(ctx.member.displayColor)
        .setTitle(title)
        .setDescription(theory)
        .setFooter(
            "Use the buttons below to vote on the theory. Votes remain anonymous and should reflect the quality of the post."
        );

    if (imageurl) embed.setImage(imageurl);

    const theoryChan = ctx.member.guild.channels.cache.get(channelIDs.theorylist) as TextChannel;

    const poll = new Poll({ identifier: ctx.interactionID, userid: ctx.user.id });
    await ctx.connection.manager.save(poll);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SECONDARY",
            label: "0",
            emoji: { name: "upvote_pink2", id: "850586748765077514" } as EmojiIdentifierResolvable,
            customID: answerListener.generateCustomID({ index: "1", pollID: ctx.interactionID })
        }),
        new MessageButton({
            style: "SECONDARY",
            label: "0",
            emoji: { name: "downvote_blue2", id: "850586787805265990" } as EmojiIdentifierResolvable,
            customID: answerListener.generateCustomID({ index: "0", pollID: ctx.interactionID })
        })
    ]);

    const m = await theoryChan.send({ embeds: [embed], components: [actionRow] });

    const responseEmbed = new MessageEmbed({ description: "Your theory has been submitted!" });
    const responseActionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", url: m.url, label: "View post" })
    ]);
    await ctx.send({
        embeds: [responseEmbed.toJSON()],
        components: [(<unknown>responseActionRow) as ComponentActionRow]
    });
};
