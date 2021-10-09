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

    const msgsToDelete = await prisma.gold.groupBy({
        by: ["houseOfGoldMessageUrl"],
        _count: true,
        _min: {
            createdAt: true
        },
        having: {
            houseOfGoldMessageUrl: {
                _count: { lt: 5 }
            },
            createdAt: {
                _min: { lt: new Date() }
            }
        },
        where: {
            houseOfGoldMessageUrl: { not: null }
        }
    });

    console.log(msgsToDelete);

    const ids = F.parseMessageUrl(msgsToDelete[0].houseOfGoldMessageUrl as string);

    console.log(ids);

    await ctx.editReply({ content: `ok` });
});

export default command;
