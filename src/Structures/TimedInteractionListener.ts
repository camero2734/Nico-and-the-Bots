/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    CollectorFilter,
    ContextMenuInteraction,
    GuildMember,
    Message,
    MessageComponentInteraction,
    TextChannel
} from "discord.js";
import F from "../Helpers/funcs";
import { ContextMenu } from "./EntrypointContextMenu";
import { SlashCommand } from "./EntrypointSlashCommand";

type IDsMapped<IDs extends Readonly<string[]>> = {
    [Index in keyof IDs]: IDs[Index] extends string ? `eph&${IDs[Index]}${string}` : never;
};

export class TimedInteractionListener<IDs extends Readonly<string[]>> {
    customIDs: IDsMapped<IDs>;
    constructor(
        private ctx: typeof SlashCommand.GenericContextType | typeof ContextMenu.GenericContextType | Message,
        names: IDs
    ) {
        this.customIDs = names.map((n) => {
            const hash = F.hash(names.join(",") + ctx.id + ctx.member?.id).slice(0, 10);
            return `eph&${n}${hash}`;
        }) as any;
    }
    async wait(
        timeOutMs = 30000,
        inFilter: CollectorFilter<[MessageComponentInteraction]> = async () => true
    ): Promise<IDsMapped<IDs>[number] | null> {
        const promises = this.customIDs.map((customID) => {
            return new Promise<string | null>((resolve) => {
                const timeout = setTimeout(() => resolve(null), timeOutMs);

                const filter: CollectorFilter<[MessageComponentInteraction]> = (interaction) => interaction.customId === customID && inFilter(interaction); // prettier-ignore
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
