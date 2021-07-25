import { Poll, Vote } from "@prisma/client";
import { Mutex } from "async-mutex";
import { constants } from "configuration/config";
import { CommandComponentListener } from "configuration/definitions";
import {
    Collection,
    CollectorFilter,
    Interaction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageComponentInteractionCollector,
    MessageEmbed,
    Snowflake,
    TextChannel
} from "discord.js";
import F from "./funcs";
import { prisma } from "./prisma-init";

export function strEmbed(strings: TemplateStringsArray, color?: `#${string}`): MessageEmbed {
    const baseEmbed = new MessageEmbed().setDescription(strings.join(""));
    if (color) baseEmbed.setColor(color);
    return baseEmbed;
}

export const MessageTools = {
    async awaitMessage(userID: string, channel: TextChannel, timeMS: number): Promise<Message | null> {
        const filter = (m: Message) => m.author.id === userID;
        try {
            const collected = await channel.awaitMessages({ filter, max: 1, time: timeMS, errors: ["time"] });
            const awaitedMessage = collected.first();

            return awaitedMessage || null;
        } catch (e) {
            return null;
        }
    },

    /** Takes an array of buttons and places them into an array of Action Row components */
    allocateButtonsIntoRows<T extends MessageActionRow>(buttons: T["components"][number][]): T[] {
        const components: T[] = [];

        if (buttons.length > constants.ACTION_ROW_MAX_ITEMS * constants.MAX_ACTION_ROWS)
            throw new Error("Too many buttons");

        for (let i = 0; i < buttons.length; i += constants.ACTION_ROW_MAX_ITEMS) {
            const slicedButtons = buttons.slice(i, i + constants.ACTION_ROW_MAX_ITEMS);
            components.push(<T>{
                type: "ACTION_ROW",
                components: slicedButtons
            });
        }

        return components;
    },

    async fetchAllMessages(channel: TextChannel, num = Infinity): Promise<Collection<Snowflake, Message>> {
        const MAX_MESSAGES_FETCH = 100;
        let before: Snowflake | undefined = undefined;

        let allMessages: Collection<Snowflake, Message> = new Collection();

        while (allMessages.size < num) {
            const previousSize = allMessages.size;
            const msgs: Collection<Snowflake, Message> = await channel.messages.fetch({ limit: MAX_MESSAGES_FETCH, before }); // prettier-ignore
            allMessages = allMessages.concat(msgs);

            if (allMessages.size === previousSize) break; // No new messages

            before = msgs.last()?.id;
        }

        return allMessages;
    }
};

/** Things that extend a Message object */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function MessageContext(msg: Message) {
    const listeners: Collection<string, MessageComponentInteractionCollector> = new Collection();
    return {
        msg,
        // Copying the functionality of slash create for use with discord.js
        registerComponent(customID: string, handler: (interaction: Interaction) => Promise<void>): void {
            const filter: CollectorFilter<[MessageComponentInteraction]> = (interaction) => interaction.customID === customID; // prettier-ignore
            const collector = msg.createMessageComponentInteractionCollector({ filter });

            console.log("Created collector");
            listeners.set(customID, collector);

            collector.on("collect", handler);
            collector.on("end", () => console.log(`${customID} collector ended`));
        },
        unregisterComponent(customID: string): boolean {
            const collector = listeners.get(customID);
            if (!collector) return false;

            collector.stop();
            listeners.delete(customID);
            return true;
        }
    };
}

/**
 * Returns a CommandComponentListener that handles upvote/downvote presses
 * Deletes the original message if too many downvotes
 * @param name The name passed to the CommandComponentListener
 */
type PollWithVotes = Poll & { votes: Vote[] };
export function generateUpvoteDownvoteListener(name: string): CommandComponentListener {
    const answerListener = new CommandComponentListener(name, <const>["isUpvote", "pollID"]);
    const mutex = new Mutex();

    answerListener.handler = async (interaction, connection, args) => {
        mutex.runExclusive(async () => {
            const { isUpvote, pollID } = args;
            const m = interaction.message as Message;

            const poll = await prisma.poll.findUnique({ where: { id: +pollID }, include: { votes: true } });
            if (!poll) return;

            const previousVote = poll.votes.find((v) => v.userId === interaction.user.id);

            const castVote = await prisma.vote.upsert({
                where: { id: previousVote?.id || -1 },
                update: { choice: +isUpvote },
                create: { choice: +isUpvote, userId: interaction.user.id, pollId: poll.id }
            });

            if (previousVote) previousVote.choice = castVote.choice;
            else poll.votes.push(castVote);

            await updateMessage(m, poll, +isUpvote);
        });
    };

    async function updateMessage(msg: Message, poll: PollWithVotes, lastVote: number) {
        const [actionRow] = msg.components;

        let upvotes = 0;
        for (const vote of poll.votes) {
            if (vote.choice === 1) upvotes++;
        }
        const downvotes = poll.votes.length - upvotes;

        // If the post is heavily downvoted
        if (downvotes >= Math.max(5, upvotes)) {
            await msg.delete();
        }

        const getMessageButtonWithEmoji = (name: string): MessageButton | undefined => {
            return actionRow.components.find(
                (c) => c.type === "BUTTON" && c.emoji?.name?.startsWith(name)
            ) as MessageButton;
        };
        const upvoteButton = getMessageButtonWithEmoji("upvote");
        const downvoteButton = getMessageButtonWithEmoji("downvote");
        if (!upvoteButton || !downvoteButton) return; // prettier-ignore

        if (lastVote === 0) downvoteButton.setStyle("DANGER");
        else upvoteButton.setStyle("SUCCESS");

        upvoteButton.label = `${upvotes}`;
        downvoteButton.label = `${downvotes}`;

        await msg.edit({ components: [actionRow] });

        await F.wait(1000);

        upvoteButton.setStyle("SECONDARY");
        downvoteButton.setStyle("SECONDARY");

        await msg.edit({ components: [actionRow] });
    }

    return answerListener;
}
