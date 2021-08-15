import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { emojiIDs } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import { prisma } from "../../Helpers/prisma-init";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";
import { TimedInteractionListener } from "../../Structures/TimedInteractionListener";

const GOLD_COST = 5000;

const ctxMenu = new MessageContextMenu("🪙 Gold Message");

ctxMenu.setHandler(async (ctx, msg) => {
    if (!msg.member) throw new Error("Could not find member");

    const embed = new MessageEmbed()
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setDescription(msg.content)
        .addField(
            "**Would you like to give gold to this message?**",
            "Please hit one of the buttons below to enter your choice"
        );

    const timedListener = new TimedInteractionListener(ctx, <const>["goldCtxYes", "goldCtxNo"]);
    const [yesId, noId] = timedListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Yes", emoji: emojiIDs.gold, style: "PRIMARY", customId: yesId }),
        new MessageButton({ label: "No", style: "SECONDARY", customId: noId })
    ]);

    await ctx.reply({ embeds: [embed], components: [actionRow], ephemeral: true });

    const buttonPressed = await timedListener.wait();

    if (buttonPressed !== yesId) {
        throw new CommandError(
            "You chose not to give gold. That's okay, sometimes we make decisions that don't work out and that's 100% valid. If you want to give gold again in the future, don't hesitate to reclick that context menu button to share your appreciation of that person's post. They would probably appreciate it a lot. Please give me your credits."
        );
    }

    await ctx.editReply({ content: "yeah that worked", embeds: [], components: [] });
});

export default ctxMenu;
