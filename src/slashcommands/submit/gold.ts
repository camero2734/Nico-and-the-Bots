import { channelIDs, emojiIDs, roles } from "configuration/config";
import {
    CommandComponentListener,
    CommandError,
    CommandOptions,
    CommandReactionHandler,
    CommandRunner
} from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { Poll } from "database/entities/Poll";
import { Message, MessageActionRow, MessageButton, MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { generateUpvoteDownvoteListener, MessageContext } from "helpers";
import { CommandOptionType } from "slash-create";
import { Connection } from "typeorm";

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

const answerListener = generateUpvoteDownvoteListener("goldResponse");
export const ComponentListeners: CommandComponentListener[] = [answerListener];

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
export const ReactionHandler: CommandReactionHandler = async ({ reaction, user, connection }): Promise<boolean> => {
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
            emoji: { name: "gold", id: "389216023141941249" } as any
        }),
        new MessageButton({ customID: "cancel", style: "DANGER", label: "Cancel" })
    ]);

    const m = await msg.reply({
        content: member.toString(),
        embeds: [embed],
        components: [actionRow],
        allowedMentions: { repliedUser: false, users: [member.user.id] }
    });

    const dtx = MessageContext(m);

    dtx.registerComponent("yes", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        const goldMessage = await giveGold(msg, connection);
        if (!goldMessage) {
            await m.delete();
            throw new CommandError("An error occurred");
        }

        const actionRow = new MessageActionRow().addComponents([
            new MessageButton({ style: "LINK", label: "View post", url: goldMessage.url })
        ]);

        embed.setTitle("Message was given gold!");
        m.edit({ embeds: [embed], components: [actionRow] });
    });

    dtx.registerComponent("cancel", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        embed.setTitle("This message was not given gold.");
        m.edit({ embeds: [embed], components: [] });
    });

    return true;
};

async function giveGold(msg: Message, connection: Connection): Promise<Message | null> {
    // Give user gold
    const golds =
        (await connection.getRepository(Counter).findOne({ identifier: msg.author.id, title: "GoldCount" })) ||
        new Counter({ identifier: msg.author.id, title: "GoldCount" });

    golds.count++;
    golds.lastUpdated = Date.now();
    await connection.manager.save(golds);

    // Take away credits
    const userEconomy = await connection.getRepository(Economy).findOne({ userid: msg.author.id });
    if (!userEconomy || userEconomy.credits < 5000) throw new CommandError("You don't have enough credits to give gold!"); // prettier-ignore

    userEconomy.credits -= 5000;
    await connection.manager.save(userEconomy);

    // Create poll object to save votes
    const poll = new Poll({ identifier: msg.id, userid: msg.author.id });
    await connection.manager.save(poll);

    // Create embed
    if (!msg.member) return null;

    const embed = new MessageEmbed()
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setColor("#FCE300")
        .setDescription(msg.content)
        .addField("Channel", (msg.channel as TextChannel).name, true)
        .addField("Score", `0`, true)
        .setFooter(
            `x${golds.count} | Vote on this post by clicking one of the buttons below. Your vote will remain anonymous.`,
            "http://i.imgur.com/QTzrs2Y.png"
        );

    const imageURL = msg.attachments.first()?.url;
    if (imageURL) embed.setImage(imageURL);

    const chan = msg.member.guild.channels.cache.get(channelIDs.houseofgoldtest) as TextChannel;

    const actionRow = new MessageActionRow();
    actionRow.addComponents([
        new MessageButton({
            customID: answerListener.generateCustomID({ index: "1", pollID: msg.id }),
            style: "SECONDARY",
            label: "0",
            emoji: { name: "upvote_pink2", id: "850586748765077514" } as any
        }),
        new MessageButton({
            customID: answerListener.generateCustomID({ index: "0", pollID: msg.id }),
            style: "SECONDARY",
            label: "0",
            emoji: { name: "downvote_blue2", id: "850586787805265990" } as any
        })
    ]);

    const m = await chan.send({ embeds: [embed], components: [actionRow] });

    return m;
}
