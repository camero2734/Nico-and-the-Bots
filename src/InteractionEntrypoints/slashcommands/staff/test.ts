import { startOfDay, subWeeks } from "date-fns";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();
    const monthAgo = startOfDay(subWeeks(new Date(), 4));

    console.log(monthAgo);

    const results = await prisma.messageHistory.groupBy({
        by: ["userId"],
        where: { date: { gte: monthAgo } },
        _sum: { pointsEarned: true },
        orderBy: { _sum: { pointsEarned: "desc" } }
    });

    await ctx.editReply({ content: `Got results: ${results.length}` });
});

export default command;
