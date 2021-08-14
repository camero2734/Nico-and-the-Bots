import { Prisma, TopfeedPost, TopfeedType } from ".prisma/client";
import { MessageOptions, Snowflake } from "discord.js";
import { prisma } from "../../../Helpers/prisma-init";

export interface Checked<T> {
    msg: MessageOptions;
    uniqueIdentifier: string;
    ping: boolean;
    _data: T;
}

export abstract class Watcher<T> {
    constructor(public handle: string, public channel: Snowflake) {}
    abstract type: TopfeedType;

    protected abstract fetchRecentItems(): Promise<Checked<T>[]>;

    private async checkItems(items: Checked<T>[]): Promise<Checked<T>[]> {
        const uniqueIDs = items.map((item) => item.uniqueIdentifier);
        return [];

        // const alreadyExist = await this.connection
        //     .getMongoRepository(Topfeed)
        //     .find({ where: { hash: { $in: uniqueIDs }, type: this.type } });

        // return items.filter((item) => !alreadyExist.some((tf) => tf.hash === item.uniqueIdentifier));
    }

    async fetchNewItems(): Promise<Checked<T>[]> {
        const newItems = await this.fetchRecentItems();
        return await this.checkItems(newItems);
    }

    async getLatestItem<Subtype extends string>(
        subtype: Subtype
    ): Promise<(TopfeedPost & { data: T; subtype: Subtype }) | null> {
        return prisma.topfeedPost.findFirst({
            where: { type: this.type, subtype },
            orderBy: { createdAt: "desc" }
        }) as unknown as TopfeedPost & { data: T; subtype: Subtype };
    }
}
