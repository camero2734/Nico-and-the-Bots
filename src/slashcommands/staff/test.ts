import { PrismaClient } from "@prisma/client";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Economy } from "../../database/entities/Economy";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    // const user = await ctx.prisma.user.findUnique({
    //     where: { id: BigInt(ctx.member.id) },
    //     include: { dailyBox: true, tags: true }
    // });
    // if (!user) return;
    // user.joinedAt = new Date();
    // await ctx.prisma.user.create({
    //     data: {
    //         id: BigInt(ctx.member.id),
    //         dailyBox: { create: {} }
    //     }
    // });
    // ctx.prisma.$transaction([ctx.prisma.user.update({ where: { id: user.id }, data: { score: { increment: 200 } } })]);
    // const tagName = "whatsup";
    // ctx.prisma.$queryRaw`
    //     SELECT * FROM tags WHERE name=${tagName}
    //     JOIN users
    // `;
    // await prisma.user.update({ where: { id: user.id }, data: { score: { increment: 200 } } });
    // user.tags;
};
