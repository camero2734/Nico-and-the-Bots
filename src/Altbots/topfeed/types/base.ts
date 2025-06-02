import type { Prisma } from "@prisma/client";
import type { BaseMessageOptions, Message, Snowflake } from "discord.js";
import { NicoClient } from "../../../../app";
import { prisma } from "../../../Helpers/prisma-init";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TopfeedPost, TopfeedType } from ".prisma/client";

export interface Checked<T extends object> {
	uniqueIdentifier: string;
	ping: boolean;
	_data: T;
}

export abstract class Watcher<T extends object> {
	constructor(
		public handle: string,
		public channel: Snowflake,
		public pingedRole: Snowflake,
	) {}
	abstract type: TopfeedType;

	protected abstract fetchRecentItems(): Promise<Checked<T>[]>;
	public abstract generateMessages(
		checkedItems: Checked<T>[],
	): Promise<BaseMessageOptions[][]>;

	protected client = NicoClient;

	async afterCheck(_msg: Message): Promise<void> {
		// Override in child to do something
	}

	async #checkItems(items: Checked<T>[]): Promise<Checked<T>[]> {
		const uniqueIDs = items.map((item) => item.uniqueIdentifier);

		const idsThatExist = (
			await prisma.topfeedPost.findMany({
				where: { id: { in: uniqueIDs }, type: this.type },
				select: { id: true },
			})
		).map((p) => p.id);
		const idSet = new Set(idsThatExist);

		const newItems = items.filter((item) => !idSet.has(item.uniqueIdentifier));

		await prisma.topfeedPost.createMany({
			data: newItems.map((item) => ({
				id: item.uniqueIdentifier,
				type: this.type,
				handle: this.handle,
				subtype:
					"subtype" in item._data && typeof item._data.subtype === "string"
						? item._data.subtype
						: undefined,
				data: item._data as Prisma.InputJsonArray,
			})),
		});

		return newItems;
	}

	async fetchNewItems(): Promise<[Checked<T>[], BaseMessageOptions[][]]> {
		try {
			const fetchedItems = await this.fetchRecentItems();
			const checkedItems = await this.#checkItems(fetchedItems);
			return [checkedItems, await this.generateMessages(checkedItems)];
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			const errorType = e instanceof Error ? e.name : "UnknownError";
			console.error(
				`Error in fetchNewItems for ${this.type} (${errorType})`,
				message,
			);
			console.error(`${e}`.slice(0, 100));
			return [[], []];
		}
	}

	protected async getLatestItem<Subtype extends string>(
		subtype?: Subtype,
	): Promise<(TopfeedPost & { data: T & { subtype: Subtype } }) | null> {
		return prisma.topfeedPost.findFirst({
			where: { type: this.type, handle: this.handle, subtype },
			orderBy: { createdAt: "desc" },
		}) as unknown as TopfeedPost & { data: T & { subtype: Subtype } };
	}
}
