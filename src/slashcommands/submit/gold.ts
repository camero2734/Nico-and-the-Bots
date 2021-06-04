import { channelIDs, emojiIDs, roles } from "configuration/config";
import { CommandError, CommandOptions, CommandReactionHandler, CommandRunner } from "configuration/definitions";
import { Poll } from "database/entities/Poll";
import { EmbedField, Message, MessageActionRow, MessageButton, MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { MessageContext } from "helpers";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: `Gives a message gold. Must be used in #house-of-gold`,
    options: [
        {
            name: "code",
            description: "The code to submit a message to house of gold.",
            required: true,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ code: string }> = async (ctx) => {
    const hex = Buffer.from(ctx.opts.code, "base64").toString("hex");
    const uniqueID = BigInt(`0x${hex}`).toString();
    const [messageid, channelid] = [uniqueID.slice(0, 18), uniqueID.slice(18)] as Snowflake[];

    const channel = ctx.channel.guild.channels.cache.get(channelid) as TextChannel;
    if (!channel) throw new CommandError("Unable to find channel");

    const msg = await channel.messages.fetch(messageid);
    if (!msg) throw new CommandError("Unable to locate message");

    const embed = new MessageEmbed()
        .setTitle("Would you like to gold this mesage?")
        .setAuthor(<string>msg.member?.displayName, msg.author.displayAvatarURL())
        .setDescription(msg.content)
        .setColor("#FCE300");

    await ctx.send({ embeds: [embed.toJSON()] });
};

// Give command to copy and paste if someone reacts with :gold:
export const ReactionHandler: CommandReactionHandler = async ({ reaction, user }): Promise<boolean> => {
    if (reaction.emoji.id !== emojiIDs.gold) return false;

    const member = await reaction.message.guild?.members.fetch(user.id);
    if (!member) return true; // Handled, but failed

    // Only DEs can use gold
    if (!member.roles.cache.has(roles.deatheaters)) return true;

    // TODO: Remove once released
    if (!member.roles.cache.has(roles.staff)) return true;

    const msg = await reaction.message.fetch();
    const opMember = await msg.guild?.members.fetch(msg.author.id);

    if (!opMember) return true;

    const embed = new MessageEmbed()
        .setTitle("Would you like to gold this mesage?")
        .setAuthor(opMember.displayName, msg.author.displayAvatarURL())
        .setDescription(msg.content)
        .setColor("#FCE300");

    const actionRow = new MessageActionRow();
    actionRow.addComponents([
        new MessageButton({
            customID: "yes",
            style: "SUCCESS",
            label: "Yes (5000 credits)",
            emoji: { name: "gold", id: "389216023141941249" }
        }),
        new MessageButton({ customID: "cancel", style: "DANGER", label: "Cancel" })
    ]);

    const m = await msg.reply({ embed, components: [actionRow], allowedMentions: { repliedUser: false } });

    const dtx = MessageContext(m);

    dtx.registerComponent("yes", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        const success = await sendGoldMessage(msg);
        if (!success) {
            await m.delete();
            throw new CommandError("An error occurred");
        }

        embed.setTitle("Message was given gold!");
        m.edit({ embed, components: [] });
    });

    dtx.registerComponent("cancel", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        embed.setTitle("This message was not given gold.");
        m.edit({ embed, components: [] });
    });

    return true;
};

async function sendGoldMessage(msg: Message): Promise<boolean> {
    const poll = new Poll({ id: msg.id, userid: msg.author.id });
    // Create embed
    if (!msg.member) return false;
    const embed = new MessageEmbed()
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setColor("FCE300")
        .setDescription(msg.content)
        .addField("Channel", (msg.channel as TextChannel).name)
        .addField("Score", `0`)
        .setFooter(
            "x51 | Vote on this post by clicking one of the buttons below. Your vote will remain anonymous.",
            "http://i.imgur.com/QTzrs2Y.png"
        );

    const imageURL = msg.attachments.first()?.url;
    if (imageURL) embed.setImage(imageURL);

    const chan = msg.member.guild.channels.cache.get(channelIDs.houseofgoldtest) as TextChannel;

    const actionRow = new MessageActionRow();
    actionRow.addComponents([
        new MessageButton({
            customID: "good",
            style: "SUCCESS",
            label: "Good Post",
            emoji: { name: "👍", id: null }
        }),
        new MessageButton({
            customID: "bad",
            style: "DANGER",
            label: "Bad Post",
            emoji: { name: "👎", id: null }
        })
    ]);

    const m = await chan.send({ embed, components: [actionRow] });

    const dtx = MessageContext(m);

    dtx.registerComponent("good", async (interaction) => {
        const vote = poll.votes.find((v) => v.userid === interaction.user.id);

        // Add or update vote
        if (vote) vote.index = 1;
        else poll.votes.push({ index: 1, userid: interaction.user.id });

        // Update embed
        const field = embed.fields.find((f) => f.name === "Score") as EmbedField;
        const count = poll.votes.length;
        let score = 0;
        for (const vote of poll.votes) {
            score += vote.index === 1 ? 1 : -1;
        }
        field.value = score >= 0 ? `+${score} [${count}]` : `${score} [${count}]`;

        await m.edit({ embed });
    });

    dtx.registerComponent("bad", async (interaction) => {
        const vote = poll.votes.find((v) => v.userid === interaction.user.id);

        // Add or update vote
        if (vote) vote.index = 0;
        else poll.votes.push({ index: 0, userid: interaction.user.id });

        // Update embed
        const field = embed.fields.find((f) => f.name === "Score") as EmbedField;
        const count = poll.votes.length;
        let score = 0;
        for (const vote of poll.votes) {
            score += vote.index === 1 ? 1 : -1;
        }

        // If the score is too low, delete it
        if (score < -5) {
            await m.delete();
            return;
        }

        field.value = score >= 0 ? `+${score} [${count}]` : `${score} [${count}]`;

        await m.edit({ embed });
    });

    return true;
}
