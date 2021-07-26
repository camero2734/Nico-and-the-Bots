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
import {
    DMChannel,
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    TextChannel
} from "discord.js";
import { generateUpvoteDownvoteListener, MessageContext } from "helpers";
import { Connection } from "typeorm";
import F from "../../helpers/funcs";

export const Options: CommandOptions = {
    description: `This command is a placeholder. Gold messages by reacting :gold: on them.`,
    options: []
};

const answerListener = generateUpvoteDownvoteListener("goldResponse");
export const ComponentListeners: CommandComponentListener[] = [answerListener];

export const Executor: CommandRunner = async () => {
    throw new CommandError(
        "This command is not usable. You can gold messages by reacting with <:gold:389216023141941249>."
    );
};

// Give command to copy and paste if someone reacts with :gold:
export const ReactionHandler: CommandReactionHandler = async ({ reaction, user, connection }): Promise<boolean> => {
    if (reaction.emoji.id !== emojiIDs.gold) return false;

    const member = await reaction.message.guild?.members.fetch(user.id);
    if (!member) return true; // Handled, but failed
    0;
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
            customId: "yes",
            style: "SUCCESS",
            label: "Yes (5000 credits)",
            emoji: { name: "gold", id: "389216023141941249" } as EmojiIdentifierResolvable
        }),
        new MessageButton({ customId: "cancel", style: "DANGER", label: "Cancel" })
    ]);

    const dm = await member.createDM();
    const m = await dm.send({
        embeds: [embed],
        components: [actionRow]
    });

    const dtx = MessageContext(m);

    dtx.registerComponent("yes", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        try {
            const goldMessage = await giveGold(msg, member, connection);

            const actionRow = new MessageActionRow().addComponents([
                new MessageButton({ style: "LINK", label: "View post", url: goldMessage.url })
            ]);

            embed.setTitle("Message was given gold!");
            m.edit({ embeds: [embed], components: [actionRow] });
        } catch (e) {
            await m.delete();
            const err = e instanceof CommandError ? e : new CommandError("An error occurred");

            await dm.send({ embeds: [new MessageEmbed().setDescription(err.message)] });
        }
        dtx.unregisterComponent("yes");
    });

    dtx.registerComponent("cancel", async (interaction) => {
        if (interaction.user.id !== user.id) return;

        embed.setTitle("This message was not given gold.");
        m.edit({ embeds: [embed], components: [] });
        dtx.unregisterComponent("cancel");
    });

    return true;
};

async function giveGold(msg: Message, givingMember: GuildMember, connection: Connection): Promise<Message> {
    // You can't gold yourself
    if (msg.author.id === givingMember.id) throw new CommandError("You cannot give yourself gold.");

    // Need to combine to give a truly unique id since multiple people can gold the same message
    const pollID = `${msg.id}+${givingMember.id}`;

    // Give user gold
    const golds =
        (await connection.getRepository(Counter).findOne({ identifier: msg.author.id, title: "GoldCount" })) ||
        new Counter({ identifier: msg.author.id, title: "GoldCount" });

    golds.count++;
    golds.lastUpdated = Date.now();
    await connection.manager.save(golds);

    // Take away credits
    const userEconomy = await connection.getRepository(Economy).findOne({ userid: givingMember.id });
    if (!userEconomy || userEconomy.credits < 5000) throw new CommandError("You don't have enough credits to give gold!"); // prettier-ignore
    userEconomy.credits -= 5000;

    // Ensure a poll doesn't already exist
    const oldPoll = await connection.getRepository(Poll).findOne({ identifier: pollID });
    if (oldPoll) throw new CommandError("You've already given this message gold!");

    // Create poll object to save votes
    const poll = new Poll({ identifier: pollID, userid: givingMember.id });
    await connection.manager.save(poll);

    // Create embed
    if (!msg.member) throw new Error("Unable to locate member");

    const embed = new MessageEmbed()
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setColor("#FCE300")
        .setDescription(msg.content)
        .addField("Channel", `${msg.channel}`, true)
        .addField("Posted", F.discordTimestamp(msg.createdAt), true)
        .addField("Given gold by", `${givingMember}`)
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
            customId: answerListener.generateCustomID({ index: "1", pollID }),
            style: "SECONDARY",
            label: "0",
            emoji: { name: "upvote_pink2", id: "850586748765077514" } as EmojiIdentifierResolvable
        }),
        new MessageButton({
            customId: answerListener.generateCustomID({ index: "0", pollID }),
            style: "SECONDARY",
            label: "0",
            emoji: { name: "downvote_blue2", id: "850586787805265990" } as EmojiIdentifierResolvable
        }),
        new MessageButton({
            url: msg.url,
            style: "LINK",
            label: "View message"
        })
    ]);

    const m = await chan.send({ embeds: [embed], components: [actionRow] });

    await connection.manager.save(userEconomy);
    return m;
}
