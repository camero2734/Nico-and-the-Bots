import { startOfDay, subDays, subWeeks } from "date-fns";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const app = await prisma.firebreatherApplication.findFirst({
        where: {
            userId: ctx.user.id,
            OR: [
                { decidedAt: null }, // Hasn't been decided yet
                {
                    // Recently denied application
                    decidedAt: { not: null },
                    submittedAt: { gt: subDays(new Date(), 14) },
                    approved: false
                }
            ]
        }
    });

    console.log(app, /APP/);

    await ctx.editReply("ok");
});

export default command;
