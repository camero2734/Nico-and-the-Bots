import { channelIDs } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { EmojiIdentifierResolvable, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { generateUpvoteDownvoteListener } from "helpers";
import { CommandOptionType, ComponentActionRow } from "slash-create";
import { prisma } from "../../helpers/prisma-init";

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

    const poll = await prisma.poll.create({
        data: { userId: ctx.user.id, options: ["upvote", "downvote"], name: title }
    });

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SECONDARY",
            label: "0",
            emoji: { name: "upvote_pink2", id: "850586748765077514" } as EmojiIdentifierResolvable,
            customID: answerListener.generateCustomID({ index: "1", pollID: poll.id.toString() })
        }),
        new MessageButton({
            style: "SECONDARY",
            label: "0",
            emoji: { name: "downvote_blue2", id: "850586787805265990" } as EmojiIdentifierResolvable,
            customID: answerListener.generateCustomID({ index: "0", pollID: poll.id.toString() })
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
