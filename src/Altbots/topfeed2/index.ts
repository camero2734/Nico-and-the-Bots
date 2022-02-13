import { secondsToMilliseconds } from "date-fns";
import { MessageOptions } from "discord.js/packages/discord.js";
import { channelIDs, roles } from "../../Configuration/config";
import { prisma } from "../../Helpers/prisma-init";
import { TopfeedService } from "./service";

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

    abstract run(): Promise<ITopfeedRunOutput>;
}

const TylerInfo = <const>{
    displayName: "Tyler Joseph",
    channelId: channelIDs.topfeed.tyler,
    roleId: roles.topfeed.selectable.tyler
};

const sources: TopfeedSource[] = [
    // new TwitterSource({ ...TylerInfo, handle: "tylerrjoseph" }),
    // new InstagramSource({ ...TylerInfo, username: "tylerrjoseph" }),
    // new TiktokSource({ ...TylerInfo, username: "tylerrjoseph" }),
    // new WebsiteSource({
    //     displayName: "DMAORG Root Page",
    //     channelID: channelIDs.topfeed.dmaorg,
    //     roleId: roles.topfeed.selectable.dmaorg,
    //     url: "https://dmaorg.info/"
    // })
];

new TopfeedService(sources).run();
