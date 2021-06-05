import { channelIDs } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import Discord, { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
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

const answerListener = new CommandComponentListener("theoryresponse", <const>["index", "theoryID"]);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner<{ title: string; theory: string; imageurl?: string }> = async (ctx) => {
    const { title, theory, imageurl } = ctx.opts;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .setColor(ctx.member.displayHexColor)
        .setTitle(title)
        .setDescription(theory)
        .setFooter(
            "Use the buttons below to vote on the theory. Votes remain anonymous and should reflect the quality of the post."
        );

    if (imageurl) embed.setImage(imageurl);

    const theoryChan = ctx.member.guild.channels.cache.get(channelIDs.theorylist) as TextChannel;

    const poll = new Poll({ id: ctx.interactionID, userid: ctx.user.id });
    await ctx.connection.manager.save(poll);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SUCCESS",
            label: "0",
            emoji: { name: "upvote_pink2", id: "850586748765077514" },
            customID: answerListener.generateCustomID({ index: "1", theoryID: ctx.interactionID })
        }),
        new MessageButton({
            style: "DANGER",
            label: "0",
            emoji: { name: "downvote_blue2", id: "850586787805265990" },
            customID: answerListener.generateCustomID({ index: "0", theoryID: ctx.interactionID })
        })
    ]);

    const m = await theoryChan.send({ embed, components: [actionRow] });

    const responseEmbed = new MessageEmbed({ description: "Your theory has been submitted!" });
    const responseActionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", url: m.url, label: "View post" })
    ]);
    await ctx.send({
        embeds: [responseEmbed.toJSON()],
        components: [(<unknown>responseActionRow) as ComponentActionRow]
    });
};

answerListener.handler = async (interaction, connection, args) => {
    const { index, theoryID } = args;
    const m = interaction.message as Discord.Message;

    const poll = await connection.getRepository(Poll).findOne({ id: theoryID });
    if (!poll) return;

    const vote = poll.votes.find((v) => v.userid === interaction.user.id);
    if (vote) vote.index = +index;
    else poll.votes.push({ index: +index, userid: interaction.user.id });

    await connection.manager.save(poll);

    await updateTheoryMessage(m, poll);
};

async function updateTheoryMessage(msg: Discord.Message, poll: Poll) {
    const [actionRow] = msg.components;

    let upvotes = 0;
    for (const vote of poll.votes) {
        if (vote.index === 1) upvotes++;
    }
    const downvotes = poll.votes.length - upvotes;

    // If the post is heavily downvoted
    if (downvotes >= Math.max(5, upvotes)) {
        await msg.delete();
    }

    const upvoteButton = actionRow.components.find((c) => c.style === "SUCCESS");
    const downvoteButton = actionRow.components.find((c) => c.style === "DANGER");
    if (!upvoteButton || !downvoteButton) return;

    upvoteButton.label = `${upvotes}`;
    downvoteButton.label = `${downvotes}`;

    await msg.edit({ components: [actionRow] });
}
