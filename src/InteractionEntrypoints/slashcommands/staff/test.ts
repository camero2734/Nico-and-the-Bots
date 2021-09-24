import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    const goldCount = await prisma.gold.count({ where: { toUserId: ctx.user.id } });

    await ctx.reply(`${goldCount} golds`);
});

export default command;
