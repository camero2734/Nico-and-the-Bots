import { Prisma, PrismaClient } from "@prisma/client";
import chalk from "chalk";
import consola from "consola";
import { startOfDay, subWeeks } from "date-fns";

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

prisma.$on("query", (e) => {
    const prefix = chalk.red("Query");
    const time = chalk.yellow(`${e.duration}ms`);
    const query = chalk.gray(e.query);
    consola.debug(`${prefix} [${time}]: ${query}`);
});

export const queries = {
    async scoresOverTime(weeks = 1): Promise<{ score: number; place: number; userId: string }[]> {
        const monthAgo = startOfDay(subWeeks(new Date(), weeks));
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
    },
    async alltimePlaceNum(score: number): Promise<number> {
        try {
            const res = await prisma.user.count({ where: { score: { gt: score } } });
            return res + 1;
        } catch {
            return 1;
        }
    },
    async findOrCreateUser<T extends Prisma.UserInclude>(
        id: string,
        include?: T
    ): Promise<Prisma.UserGetPayload<{ include: T }>> {
        const res = await prisma.user.upsert({
            where: { id },
            include: include,
            create: { id, dailyBox: { create: {} } },
            update: {}
        });
        return res as any; // The return type is correct but Typescript is being a boomwhacker
    },
    async getJoinedNum(date: Date): Promise<number> {
        const numJoinedBefore = await prisma.user.count({ where: { joinedAt: { lt: date } } });
        return numJoinedBefore + 1; // If 0 people joined before you, you are number 1
    }
};
