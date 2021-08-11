import { MessageEmbed } from "discord.js";
import { createInteractionListener } from "../interaction-listener";

const [name, interaction, genCustomId] = createInteractionListener("botLog", <const>[], async (ctx, args) => {
    await ctx.editReply({ components: [] });

    const thread = await ctx.message.startThread("Information Request", 60, `${ctx.member.displayName} requested`);

    await thread.send({
        embeds: [new MessageEmbed({ description: `${ctx.member} requested more information about this item` })]
    });
});

export const BotLogInteractionListener = { name, interaction, genCustomId };
