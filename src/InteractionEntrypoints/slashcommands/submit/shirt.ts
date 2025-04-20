import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import { channelIDs, roles } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { guild } from "../../../../app";

const command = new SlashCommand({
    description: "Submit a suggestion for a #shirt-discussion announcement",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });
    if (!ctx.member.roles.cache.get(roles.staff)) return;

    const dm = await ctx.member.createDM();
    const embed = new EmbedBuilder()
        .setTitle("Shirt Discussion")
        .setDescription("Please reply (via the context menu action) to this message with your proposed announcement.")
        .setFooter({ text: "Thank you for your contribution!" });
    const message = await dm.send({ embeds: [embed], components: [shirtReplyActionRow] });

    await ctx.editReply({
        content: `Please continue in [your DMs](${message.url})`,
    });
});

const shirtReplyActionRow = command.addReplyListener("shirtReply", async (reply, repliedTo) => {
    console.log("shirtReply", reply.content);
    const member = await guild.members.fetch(reply.author.id);

    const footer = new EmbedBuilder()
        .setFooter({ text: `Submitted by ${member.displayName}`, iconURL: member.avatarURL() || undefined });

    const staffChan = await guild.channels.fetch(channelIDs.shirtSuggestions);
    if (!staffChan || !staffChan.isSendable()) return;

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .setComponents(
            new ButtonBuilder()
                .setCustomId(genAnswerId({ userId: reply.author.id, answer: "accept" }))
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(genAnswerId({ userId: reply.author.id, answer: "reject" }))
                .setLabel("Reject")
                .setStyle(ButtonStyle.Danger)
        );

    await staffChan.send({
        content: reply.content,
        embeds: [footer],
        components: [actionRow],
        files: reply.attachments.map((attachment) => attachment.url),
        allowedMentions: { parse: [] },
    });

    const embed = new EmbedBuilder()
        .setDescription("Your message has been sent to the staff team.")
        .setFooter({ text: "Thank you for your contribution!" });

    await repliedTo.edit({ embeds: [embed], components: [] });
});

const genAnswerId = command.addInteractionListener("shirtSbmtAnswer", ["userId", "answer"], async (ctx, args) => {
    await ctx.deferUpdate();

    const accepted = args.answer === "accept";

    const originalMember = await guild.members.fetch(args.userId);
    if (!originalMember) return;

    await ctx.editReply({ components: [] });

    let m: Message | undefined;
    if (accepted) {
        const shirtAnnouncementsChan = await guild.channels.fetch(channelIDs.bottest);
        if (!shirtAnnouncementsChan || !shirtAnnouncementsChan.isSendable()) return;

        m = await shirtAnnouncementsChan.send({
            content: ctx.message.content,
            embeds: ctx.message.embeds,
            files: ctx.message.attachments.map((attachment) => attachment.url),
            allowedMentions: { parse: [] },
        });
    }

    const updateEmbed = EmbedBuilder.from(ctx.message.embeds[0]);
    updateEmbed.setColor(accepted ? "Green" : "Red");
    if (m) updateEmbed.addFields({ name: "URL", value: `[View announcement](${m.url})` });
    updateEmbed.setFooter({ text: `${ctx.message.embeds[0].footer?.text} | ${accepted ? "Accepted" : "Rejected"} by ${ctx.member.displayName}`, iconURL: ctx.message.embeds[0].footer?.iconURL });
    await ctx.editReply({ components: [], embeds: [updateEmbed] });

    const dm = await originalMember.createDM();
    if (dm) {
        const embed = new EmbedBuilder()
            .setTitle("Shirt Discussion")
            .setDescription(`Your shirt discussion announcement has been ${args.answer === "accept" ? "accepted!" : "rejected."}`)
            .setFooter({ text: `Submitted by ${originalMember.displayName}`, iconURL: originalMember.avatarURL() || undefined });

        const actionRow = m && new ActionRowBuilder<ButtonBuilder>()
            .setComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(m.url)
                    .setLabel("View Announcement")
            );

        await dm.send({ embeds: [embed], components: actionRow ? [actionRow] : [] });
    }
});

export default command;
