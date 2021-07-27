import { channelIDs, emojiIDs, roles } from "configuration/config";
import { CommandError } from "configuration/definitions";
import {
    EmojiIdentifierResolvable,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageReaction,
    TextChannel,
    User
} from "discord.js";
import { EphemeralInteractionListener } from "../../helpers/ephemeral-interaction-listener";
import F from "../../helpers/funcs";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";

const command = new SlashCommand(<const>{
    description: `This command is a placeholder. Gold messages by reacting :gold: on them.`,
    options: []
});

command.setHandler(async () => {
    throw new CommandError(
        "This command is not usable. You can gold messages by reacting with <:gold:389216023141941249>."
    );
});

command.addReactionListener("messageGold", async (reaction, user, safeExecute) => {
    if (reaction.emoji.id !== emojiIDs.gold) return false;
    safeExecute(askToSendGold(reaction, user));
    return true;
});

async function askToSendGold(reaction: MessageReaction, user: User): Promise<void> {
    const member = await reaction.message.guild?.members.fetch(user.id);
    if (!member) return; // Handled, but failed

    // Only DEs can use gold
    if (!member.roles.cache.has(roles.deatheaters)) return;

    // TODO: Remove once released
    if (!member.roles.cache.has(roles.staff)) return;

    const msg = await reaction.message.fetch();
    const opMember = await msg.guild?.members.fetch(msg.author.id);

    if (!opMember) return;

    const embed = new MessageEmbed()
        .setTitle("Would you like to gold this mesage?")
        .setAuthor(opMember.displayName, msg.author.displayAvatarURL())
        .setDescription(msg.content)
        .setColor("#FCE300");

    const dm = await member.createDM();
    const m = await dm.send({
        embeds: [new MessageEmbed({ description: "THE COUNCIL IS REVIEWING YOUR GOLD REQUEST" })]
    });

    const ephemeralListener = new EphemeralInteractionListener(m, <const>["yes"]);
    const [yesId] = ephemeralListener.customIDs;

    const actionRow = new MessageActionRow();
    actionRow.addComponents([
        new MessageButton({
            customId: yesId,
            style: "SUCCESS",
            label: "Yes (5000 credits)",
            emoji: { name: "gold", id: "389216023141941249" } as EmojiIdentifierResolvable
        }),
        new MessageButton({ customId: "cancel", style: "DANGER", label: "Cancel" })
    ]);

    await m.edit({
        embeds: [embed],
        components: [actionRow]
    });

    const result = await ephemeralListener.wait();

    if (result !== yesId) {
        m.edit({
            embeds: [new MessageEmbed({ description: "Gold was not given." })],
            components: []
        });
        return;
    }

    const goldMessage = await giveGold(msg, member);

    const finalActionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", label: "View post", url: goldMessage.url })
    ]);

    embed.setTitle("Message was given gold!");
    m.edit({ embeds: [embed], components: [finalActionRow] });
}

async function giveGold(msg: Message, givingMember: GuildMember): Promise<Message> {
    const GOLD_COST = 5000;
    // You can't gold yourself
    if (msg.author.id === givingMember.id) throw new CommandError("You cannot give yourself gold.");

    if (!msg.member) throw new Error("Unable to locate member");

    const { credits } =
        (await prisma.user.findUnique({ where: { id: givingMember.id }, select: { credits: true } })) || {};

    if (!credits || credits < GOLD_COST) throw new CommandError("You don't have enough credits!");

    // Perform in transaction
    await prisma.$transaction([
        // Give user gold
        prisma.gold.create({
            data: {
                toUserId: msg.author.id,
                fromUserId: givingMember.id,
                channelId: msg.channel.id,
                messageId: msg.id
            }
        }),
        // Take away credits from giver
        prisma.user.update({
            where: { id: givingMember.id },
            data: { credits: { decrement: GOLD_COST } }
        })
    ]);

    const goldCount = await prisma.gold.count({ where: { toUserId: msg.author.id } });

    const embed = new MessageEmbed()
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setColor("#FCE300")
        .setDescription(msg.content)
        .addField("Channel", `${msg.channel}`, true)
        .addField("Posted", F.discordTimestamp(msg.createdAt), true)
        .addField("Given gold by", `${givingMember}`)
        .setFooter(
            `x${goldCount} | Vote on this post by clicking one of the buttons below. Your vote will remain anonymous.`,
            "http://i.imgur.com/QTzrs2Y.png"
        );

    const imageURL = msg.attachments.first()?.url;
    if (imageURL) embed.setImage(imageURL);

    const chan = msg.member.guild.channels.cache.get(channelIDs.houseofgoldtest) as TextChannel;

    const actionRow = await genActionRow(msg);

    const m = await chan.send({ embeds: [embed], components: [actionRow] });

    return m;
}

const genActionRow = command.upvoteDownVoteListener("goldResponse");
export default command;
