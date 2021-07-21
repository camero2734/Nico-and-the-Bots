import { PrismaClient } from "@prisma/client";
import chalk from "chalk";
import consola from "consola";

export const prisma = new PrismaClient({
    log: [
        {
            emit: "event",
            level: "query"
        },
        {
            emit: "stdout",
            level: "error"
        },
        {
            emit: "stdout",
            level: "info"
        },
        {
            emit: "stdout",
            level: "warn"
        }
    ]
});
export type PrismaType = typeof prisma;

// Middleware to create user if not exist
(async () => {
    const arr_userIds = (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
    const userIds = new Set(arr_userIds);

    prisma.$use(async (params, next) => {
        const userId: string | undefined = params.args?.data?.userId;
        if (userId && !userIds.has(userId)) {
            // Need to create user first
            await prisma.user.create({
                data: { id: userId, dailyBox: { create: {} } }
            });
            userIds.add(userId);
        }
        return next(params);
    });
})();

prisma.$on("query", (e) => {
    const prefix = chalk.red("Query");
    const time = chalk.yellow(`${e.duration}ms`);
    const query = chalk.gray(e.query);
    consola.debug(`${prefix} [${time}]: ${query}`);
});
