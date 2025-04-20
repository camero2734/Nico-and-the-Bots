import { EmbedBuilder } from "discord.js";
import { roles } from "../../../Configuration/config";
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
    const message = await dm.send({ embeds: [embed], components: [actionRow] });

    await ctx.editReply({
        content: `Please continue in [your DMs](${message.url})`,
    });
});

const actionRow = command.addReplyListener("shirtReply", async (reply, repliedTo) => {
    console.log("Got reply", reply.content);
    const embed = new EmbedBuilder()
        .setDescription("Thank you for your contribution!")
        .setColor("#FFFFFF")
        .setFooter({ text: "Thank you for your contribution!" });

    await repliedTo.edit({ embeds: [embed] });
});

export default command;
