import { constants } from "configuration/config";
import { CollectorFilter, Interaction, Message, MessageComponentInteraction, TextChannel } from "discord.js";
import { ComponentActionRow, ComponentButton, ComponentType } from "slash-create";

export const MessageTools = {
    async awaitMessage(userID: string, channel: TextChannel, timeMS: number): Promise<Message | null> {
        const filter = (m: Message) => m.author.id === userID;
        try {
            const collected = await channel.awaitMessages(filter, { max: 1, time: timeMS, errors: ["time"] });
            const awaitedMessage = collected.first();

            return awaitedMessage || null;
        } catch (e) {
            return null;
        }
    },

    /** Takes an array of buttons and places them into an array of Action Row components */
    allocateButtonsIntoRows(buttons: ComponentButton[]): ComponentActionRow[] {
        const components: ComponentActionRow[] = [];

        if (buttons.length > constants.ACTION_ROW_MAX_ITEMS * constants.MAX_ACTION_ROWS)
            throw new Error("Too many buttons");

        for (let i = 0; i < buttons.length; i += constants.ACTION_ROW_MAX_ITEMS) {
            const slicedButtons = buttons.slice(i, i + constants.ACTION_ROW_MAX_ITEMS);
            components.push({
                type: ComponentType.ACTION_ROW,
                components: slicedButtons
            });
        }

        return components;
    }
};

/** Things that extend a Message object */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function MessageContext(msg: Message) {
    return {
        msg,
        // Copying the functionality of slash create for use with discord.js
        registerComponent(customID: string, handler: (interaction: Interaction) => Promise<void>): void {
            const filter: CollectorFilter<[MessageComponentInteraction]> = (interaction) => interaction.customID === customID; // prettier-ignore
            const collector = msg.createMessageComponentInteractionCollector(filter);

            console.log("Created collector");

            collector.on("collect", handler);
            collector.on("end", () => console.log(`${customID} collector ended`));
        },
        getLink(): string {
            return `https://discord.com/channels/${msg.guild?.id}/${msg.channel.id}/${msg.id}`;
        }
    };
}
