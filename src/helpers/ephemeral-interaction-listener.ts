/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectorFilter, MessageComponentInteraction } from "discord.js";
import F from "./funcs";
import { ExtendedInteraction } from "./slash-command";

type IDsMapped<IDs extends Readonly<string[]>> = {
    [Index in keyof IDs]: IDs[Index] extends string ? `eph&${IDs[Index]}${string}` : never;
};

export class EphemeralInteractionListener<IDs extends Readonly<string[]>> {
    customIDs: IDsMapped<IDs>;
    constructor(private ctx: ExtendedInteraction, private names: IDs) {
        this.customIDs = names.map((n) => {
            const hash = F.hash(names.join(",") + ctx.id + ctx.user.id).slice(0, 10);
            return `eph&${n}${hash}`;
        }) as any;
    }
    async wait(): Promise<IDsMapped<IDs>[number] | null> {
        const promises = this.customIDs.map((customID) => {
            return new Promise<string | null>((resolve) => {
                const timeout = setTimeout(() => resolve(null), 120 * 1000);

                const filter: CollectorFilter<[MessageComponentInteraction]> = (interaction) => interaction.customId === customID; // prettier-ignore
                const collector = this.ctx.channel.createMessageComponentCollector({ filter });

                collector.on("collect", () => {
                    clearTimeout(timeout);
                    resolve(customID);
                });
                collector.on("end", () => console.log(`${customID} collector ended`));
            });
        });

        const result = await Promise.race(promises); // We only care about the first button pressed
        return result as IDsMapped<IDs>[number] | null;
    }
}
