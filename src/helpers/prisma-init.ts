import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export type PrismaType = typeof prisma;

// Middleware to create user if not exist
(async () => {
    const arr_userIds = (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
    const userIds = new Set(arr_userIds);

    prisma.$use(async (params, next) => {
        if (params.action.startsWith("create")) {
            const userId: string | undefined = params.args?.data?.userId;
            if (userId && !userIds.has(userId)) {
                // Need to create user first
                await prisma.user.create({
                    data: { id: userId, dailyBox: { create: {} } }
                });
                userIds.add(userId);
            }
        }
        return next(params);
    });
})();
