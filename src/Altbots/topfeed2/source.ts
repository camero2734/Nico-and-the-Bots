import { secondsToMilliseconds } from "date-fns";
import { Embed, MessageOptions } from "discord.js";
import { prisma } from "../../Helpers/prisma-init";

export class TopfeedError extends Error {}

export interface ITopfeedPost {
    name: string;
    id: string;
    messages: MessageOptions[];
}

export interface ITopfeedSourceInput {
    displayName: string;
    channelId: string;
    roleId: string;
    type?: string;
    delayMs?: number;
}

export type ITopfeedRunOutput = {
    posts: ITopfeedPost[];
};

export abstract class TopfeedSource implements Required<ITopfeedSourceInput> {
    public displayName: string;
    public channelId: string;
    public roleId: string;
    public delayMs: number;

    abstract type: string;

    constructor(private opts: ITopfeedSourceInput) {
        this.displayName = opts.displayName;
        this.channelId = opts.channelId;
        this.roleId = opts.roleId;
        this.delayMs = opts.delayMs || secondsToMilliseconds(30);
    }

    genId(id: string): string {
        return `${this.type}::${id}`;
    }

    async cullIds(postIds: string[]): Promise<Set<string>> {
        const existingPosts = await prisma.topfeedPost.findMany({
            where: { id: { in: postIds } },
            select: { id: true }
        });
        const existingIds = new Set(...existingPosts.map((post) => post.id));
        return new Set(postIds.filter((id) => !existingIds.has(id)));
    }

    embedToMsg(embed: Embed): MessageOptions {
        return { embeds: [embed] };
    }

    abstract run(): Promise<ITopfeedRunOutput>;
}
