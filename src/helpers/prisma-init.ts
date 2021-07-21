import { PrismaClient, Prisma } from "@prisma/client";
import chalk from "chalk";
import consola from "consola";
import { subMonths, startOfDay } from "date-fns";

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

export const queries = {
    async monthlyStats(): Promise<{ score: number; place: number; userId: string }[]> {
        const monthAgo = startOfDay(subMonths(new Date(), 1));
        try {
            const results = await prisma.messageHistory.groupBy({
                by: ["userId"],
                where: { date: { gte: monthAgo } },
                _sum: { pointsEarned: true },
                orderBy: { _sum: { pointsEarned: "desc" } }
            });
            const sorted = results.map((r, idx) => ({
                score: r._sum.pointsEarned || 0,
                userId: r.userId,
                place: idx + 1
            }));
            return sorted;
        } catch (e) {
            consola.error("Failed to fetch monthlyStats", e);
            return [];
        }
    }
};
