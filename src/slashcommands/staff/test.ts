import { PrismaClient } from "@prisma/client";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Economy } from "../../database/entities/Economy";

const prisma = new PrismaClient();

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    const user = await prisma.user.findUnique({ where: { id: 75345735n }, include: { dailyBox: true, tags: true } });
    if (!user) return;

    user.tags;
};
