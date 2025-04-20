import { EmbedBuilder } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Submit a suggestion for a #shirt-discussion announcement",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });
    if (ctx.user.id !== userIDs.me) throw new CommandError("Under construction");

    const dm = await ctx.member.createDM();
    const embed = new EmbedBuilder()
        .setTitle("Shirt Discussion")
        .setDescription("Please reply (via the context menu action) to this message with your proposed announcement.")
        .setColor("#00FF00")
        .setFooter({ text: footerId });
    const message = await dm.send({ embeds: [embed] });

    await ctx.editReply({
        content: `Please continue in [your DMs](${message.url})`,
    });
});

const footerId = command.addReplyListener("shirtReply", async (reply) => {
    if (reply.author.id !== userIDs.me) return false;

    const embed = new EmbedBuilder(reply.embeds[0].toJSON());
    embed.setDescription("Thank you for your contribution!")
        .setColor("#FFFFFF")
        .setFooter({ text: "Thank you for your contribution!" });

    await reply.edit({ embeds: [embed] });
});

export default command;
