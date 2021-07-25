/* eslint-disable @typescript-eslint/no-explicit-any */
import { Guild, GuildMember, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import {
    ApplicationCommandData,
    ApplicationCommandOptionChoice,
    ApplicationCommandOptionData,
    ButtonInteraction,
    Collection,
    CommandInteraction,
    Interaction,
    Message,
    MessageComponentInteraction,
    MessageOptions,
    SelectMenuInteraction,
    Snowflake
} from "discord.js";
import R from "ramda";
import { emojiIDs } from "../configuration/config";
import { CommandError } from "../configuration/definitions";
import F from "./funcs";
import { prisma } from "./prisma-init";

type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};
type CommandOptions = DeepReadonly<ApplicationCommandOptionData[]>;

export type SlashCommandData<T extends CommandOptions = ApplicationCommandOptionData[]> = Omit<
    ApplicationCommandData,
    "options" | "name"
> & {
    options: T;
};

type BaseInteraction = CommandInteraction | ButtonInteraction | SelectMenuInteraction;
export type ExtendedInteraction<T extends CommandOptions = []> = BaseInteraction & {
    send(payload: MessageOptions & { ephemeral?: boolean }): Promise<Message | void>;
    opts: OptsType<SlashCommandData<T>>;
    member: GuildMember;
    guild: Guild;
};

type SlashCommandHandler<T extends CommandOptions> = (ctx: ExtendedInteraction<T>) => Promise<void>;

export type ListenerCustomIdGenerator<T extends Readonly<string[]> = []> = (
    ctx: MessageComponentInteraction,
    args: ReturnType<CustomIDPattern<T>["toDict"]>
) => Promise<void>;

export type InteractionListener = { handler: ListenerCustomIdGenerator<any>; pattern: CustomIDPattern<any> };

export class SlashCommand<T extends CommandOptions = []> {
    #handler: SlashCommandHandler<T>;
    public interactionListeners = new Collection<string, InteractionListener>();
    public commandIdentifier: string;
    constructor(public commandData: SlashCommandData<T>) {}
    setHandler(handler: SlashCommandHandler<T>): this {
        this.#handler = handler;
        return this;
    }
    async run(interaction: BaseInteraction, opts?: OptsType<SlashCommandData<T>>): Promise<void> {
        if (!this.#handler) throw new Error("Invalid command handler");
        const ctx = interaction as ExtendedInteraction<T>;
        ctx.send = async (payload) => {
            if (ctx.replied || ctx.deferred) return ctx.editReply(payload) as Promise<Message>;
            else return ctx.reply(payload);
        };
        ctx.opts = opts || extractOptsFromInteraction(interaction as CommandInteraction);
        try {
            await this.#handler(ctx);
        } catch (e) {
            if (e instanceof CommandError) {
                const embed = new MessageEmbed()
                    .setDescription(e.message)
                    .setTitle("An error occurred!")
                    .setFooter("DEMA internet machine broke");
                ctx.send({
                    embeds: [embed],
                    ephemeral: e.sendEphemeral,
                    allowedMentions: { users: [], roles: [] }
                });
            } else {
                console.log(e);
                const embed = new MessageEmbed()
                    .setTitle("An unknown error occurred!")
                    .setFooter("DEMA internet machine really broke");
                ctx.send({ embeds: [embed] });
            }
        }
    }
    addInteractionListener<T extends Readonly<string[]> = any>(
        name: string,
        args: T,
        interactionHandler: ListenerCustomIdGenerator<T>
    ): (args: ReturnType<CustomIDPattern<T>["toDict"]>) => string {
        const argsHash = F.hash(args.join(",")).slice(0, 4); // Invalidate interactions when args are updated
        const encodedName = `${name}.${argsHash}`;
        const pattern = new CustomIDPattern(args);
        this.interactionListeners.set(encodedName, { handler: interactionHandler, pattern });
        return (args: ReturnType<CustomIDPattern<T>["toDict"]>): string => {
            // Ensure order is preserved
            const ordered = F.entries(args).sort(([key1], [key2]) => pattern.args.indexOf(key1) - pattern.args.indexOf(key2)); // prettier-ignore
            const values = ordered.map((a) => a[1]);
            return [encodedName, ...values].join(pattern.delimiter);
        };
    }
    getMutableCommandData(): ApplicationCommandData {
        return R.clone(this.commandData) as unknown as ApplicationCommandData;
    }
    upvoteDownVoteListener(name: string) {
        const gen = this.addInteractionListener(`${name}&updn`, <const>["isUpvote", "pollID"], async (ctx, args) => {
            await ctx.deferUpdate();

            const isUpvote = args.isUpvote === "1" ? 1 : 0;
            const pollId = +args.pollID;
            await prisma.vote.upsert({
                where: { pollId_userId: { userId: ctx.user.id, pollId } },
                create: { pollId, userId: ctx.user.id, choice: isUpvote },
                update: { choice: isUpvote }
            });

            const msg = ctx.message as Message;
            const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { votes: true } });
            const [actionRow] = msg.components || [];
            if (!actionRow || !poll) return;

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

            if (isUpvote) upvoteButton.setStyle("SUCCESS");
            else downvoteButton.setStyle("DANGER");

            upvoteButton.label = `${upvotes}`;
            downvoteButton.label = `${downvotes}`;

            await msg.edit({ components: [actionRow] });

            await F.wait(1000);

            upvoteButton.setStyle("SECONDARY");
            downvoteButton.setStyle("SECONDARY");

            await msg.edit({ components: [actionRow] });
        });

        const createActionRow = async (ctx: ExtendedInteraction, title?: string) => {
            const poll = await prisma.poll.create({
                data: { userId: ctx.user.id, name: title || `${name}-${Date.now()}`, options: ["downvote", "upvote"] }
            });
            return new MessageActionRow().addComponents([
                new MessageButton({
                    emoji: emojiIDs.upvote,
                    style: "SECONDARY",
                    label: "0",
                    customID: gen({ isUpvote: "1", pollID: `${poll.id}` })
                }),
                new MessageButton({
                    emoji: emojiIDs.downvote,
                    style: "SECONDARY",
                    label: "0",
                    customID: gen({ isUpvote: "0", pollID: `${poll.id}` })
                })
            ]);
        };

        return createActionRow;
    }
    static getIdentifierFromInteraction(interaction: CommandInteraction): string {
        const subcommand = interaction.options.find((o) => o.type === "SUB_COMMAND");
        if (!subcommand) return interaction.commandName;
        else return `${subcommand.name}:${interaction.commandName}`;
    }
}
/**
 * Encodes/decodes key-value pairs into the customID field
 */
export class CustomIDPattern<T extends Readonly<string[]>> {
    constructor(public args: T, public delimiter = ":") {}
    toDict(input: string): { [K in T[number]]: string } {
        const [_name, ...parts] = input.split(this.delimiter);
        const dict = {} as { [K in T[number]]: string };
        for (let i = 0; i < parts.length; i++) {
            const key: T[number] = this.args[i];
            dict[key] = parts[i];
        }
        return dict;
    }
}

/**
 * Extracts the data from the options object so they aren't nested
 */
function extractOptsFromInteraction(interaction: CommandInteraction): any {
    let arr = interaction.options.array();
    const opts: Record<string, any> = {};
    while (arr.length !== 0) {
        const newArr: typeof arr = [];
        for (const option of arr) {
            if (option.options?.size) {
                newArr.push(...option.options.array());
                continue;
            }
            opts[option.name] = option.value;
        }
        arr = newArr;
    }
    return opts;
}

/**
 *  Extracts the type for opts so they don't have to be manually typed
 */
type SnowflakeTypes = "USER" | "CHANNEL" | "MENTIONABLE" | "ROLE"; // prettier-ignore
// prettier-ignore
type ToPrimitiveType<OType> = 
     OType extends SnowflakeTypes
         ? Snowflake
     : OType extends "BOOLEAN"
         ? boolean
     : OType extends "INTEGER"
         ? number
     : OType extends "STRING"
         ? string
     : unknown;

type AsArray<T extends DeepReadonly<CommandOptions[number]>> = [T["name"], T["type"], T["required"], T["choices"]];

// Ensures that the choices array matches the specified type
type ChoicesUnion<T extends DeepReadonly<ApplicationCommandOptionChoice[]>, P> = T[number]["value"] extends P
    ? T[number]["value"]
    : never;

// prettier-ignore
type ToObject<T extends DeepReadonly<CommandOptions[number]>> = AsArray<T> extends readonly [
     infer Key,
     infer Value,
     infer Required,
     infer Choices
 ]
     ? Key extends PropertyKey
         ? {
               [P in Key]: (Choices extends DeepReadonly<ApplicationCommandOptionChoice[]> // If choices provided...
                       ? ChoicesUnion<Choices, ToPrimitiveType<Value>> // Return those choices
                       : ToPrimitiveType<Value> // Otherwise return basic type
               ) | (Required extends true ? never : undefined) // If it's not required, it can also be undefined
           }
         : never
     : never;

type ToObjectsArray<T extends CommandOptions> = {
    // @ts-expect-error: Cannot index, but it still works
    [I in keyof T]: ToObject<T[I]>;
};

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never; // prettier-ignore

type OptsType<T> = T extends SlashCommandData<infer U> ? UnionToIntersection<ToObjectsArray<U>[number]> : never;
