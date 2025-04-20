import { EmbedBuilder } from "discord.js";
import { channelIDs, roles } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

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
    if (!reply.member) return;

    const footer = new EmbedBuilder()
        .setFooter({ text: reply.member?.displayName, iconURL: reply.member.avatarURL() || undefined });

    const staffChan = await reply.guild?.channels.fetch(channelIDs.shirtSuggestions);
    if (!staffChan || !staffChan.isSendable()) return;

    await staffChan.send({
        content: reply.content,
        embeds: [footer],
        files: reply.attachments.map((attachment) => attachment.url),
        allowedMentions: { parse: [] },
    });

    const embed = new EmbedBuilder()
        .setDescription("Your message has been sent to the staff team.")
        .setFooter({ text: "Thank you for your contribution!" });

    await repliedTo.edit({ embeds: [embed], components: [] });
});

export default command;
