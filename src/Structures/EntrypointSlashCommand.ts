/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ApplicationCommandOptionData,
    ChatInputApplicationCommandData,
    Collection,
    CommandInteraction,
    Guild,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageOptions,
    Snowflake,
    TextChannel
} from "discord.js";
import R from "ramda";
import { emojiIDs } from "../Configuration/config";
import F from "../Helpers/funcs";
import { prisma } from "../Helpers/prisma-init";
import { ApplicationData, SlashCommands } from "./data";
import { InteractionEntrypoint } from "./EntrypointBase";
import { EntrypointEvents } from "./Events";
import { AutocompleteListener } from "./ListenerAutocomplete";
import { CommandOptions, extractOptsFromInteraction, OptsType, SlashCommandData } from "./SlashCommandOptions";

type SlashCommandInteraction<T extends CommandOptions = []> = CommandInteraction & {
    opts: OptsType<SlashCommandData<T>>;
    member: GuildMember;
    channel: TextChannel;
    guild: Guild;
    guildId: Snowflake;
    send(payload: MessageOptions & { ephemeral?: boolean }): Promise<Message | void>;
};
type SlashCommandHandler<T extends CommandOptions = []> = (ctx: SlashCommandInteraction<T>) => Promise<unknown>;

export class SlashCommand<T extends CommandOptions = []> extends InteractionEntrypoint<
    SlashCommandHandler<T>,
    [OptsType<SlashCommandData<T>>]
> {
    public commandIdentifier: string;
    public commandData: ChatInputApplicationCommandData;

    static GenericContextType: SlashCommandInteraction;
    public ContextType: SlashCommandInteraction<T>;

    public autocompleteListeners = new Collection<string, AutocompleteListener<OptsType<SlashCommandData<T>>>>();

    constructor(commandData: SlashCommandData<T>) {
        super();
        const defaults: Partial<ChatInputApplicationCommandData> = { type: "CHAT_INPUT" };
        this.commandData = (<unknown>{ ...commandData, ...defaults }) as ChatInputApplicationCommandData;
    }

    addAutocompleteListener(name: string, handler: AutocompleteListener<OptsType<SlashCommandData<T>>>): void {
        this.autocompleteListeners.set(name, handler);
    }

    async _run(interaction: CommandInteraction, opts?: OptsType<SlashCommandData<T>>): Promise<void> {
        const ctx = interaction as SlashCommandInteraction<T>;
        ctx.send = async (payload) => {
            if (ctx.replied || ctx.deferred) return ctx.editReply(payload) as Promise<Message>;
            else return ctx.reply(payload);
        };
        ctx.opts =
            opts || (extractOptsFromInteraction(interaction as CommandInteraction) as OptsType<SlashCommandData<T>>);

        await this.handler(ctx);
        EntrypointEvents.emit("slashCommandFinished", { entrypoint: this, ctx });
    }

    _register(path: string[]): string {
        const possibleSteps = <const>[
            ["COMMAND"],
            ["COMMAND", "SUBCOMMAND"],
            ["COMMAND", "SUBCOMMAND_GROUP", "SUBCOMMAND"]
        ];
        const steps = R.zip(possibleSteps[path.length - 1], path);

        const commandData = this.commandData as unknown as ChatInputApplicationCommandData;

        const data = ApplicationData;
        let command = {} as ChatInputApplicationCommandData;
        let subcommandGroup: ApplicationCommandOptionData | undefined;
        for (const [index, [step, value]] of steps.entries()) {
            const isLast = index === steps.length - 1;
            if (step === "COMMAND") {
                const foundCommand = data.find((p) => p.name === value) as ChatInputApplicationCommandData;
                command = foundCommand || {
                    description: value,
                    options: [],
                    ...(isLast ? commandData : {}),
                    name: value,
                    type: "CHAT_INPUT"
                };
                if (!foundCommand) data.push(command);
            } else if (step === "SUBCOMMAND_GROUP") {
                const foundSubcommandGroup = command.options?.find((o) => o.name === value);
                subcommandGroup = foundSubcommandGroup || {
                    name: value,
                    description: value,
                    options: [],
                    type: "SUB_COMMAND_GROUP"
                };
                if (!foundSubcommandGroup) command.options?.push(subcommandGroup);
            } else if (step === "SUBCOMMAND") {
                const parent = (subcommandGroup || command) as ChatInputApplicationCommandData;
                if (parent.options?.some((o) => o.name === value)) continue;

                parent.options?.push({
                    description: "Not provided",
                    ...(isLast ? commandData : {}),
                    name: value,
                    type: "SUB_COMMAND"
                } as ApplicationCommandOptionData);
            }
        }

        const id = path.join(":");
        SlashCommands.set(id, this as unknown as SlashCommand<[]>);

        return id;
    }

    upvoteDownVoteListener(name: string) {
        const gen = this.addInteractionListener(`${name}&updn`, <const>["isUpvote", "pollID"], async (ctx, args) => {
            if (!ctx.isButton()) return;

            await ctx.deferUpdate();

            const isUpvote = args.isUpvote === "1" ? 1 : 0;
            const pollId = +args.pollID;
            await prisma.vote.upsert({
                where: { pollId_userId: { userId: ctx.user.id, pollId } },
                create: { pollId, userId: ctx.user.id, choices: [isUpvote] },
                update: { choices: [isUpvote] }
            });

            const msg = ctx.message as Message;
            const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { votes: true } });
            const [actionRow] = msg.components || [];
            if (!actionRow || !poll) return;

            let upvotes = 0;
            for (const vote of poll.votes) {
                if (vote.choices[0] === 1) upvotes++;
            }
            const downvotes = poll.votes.length - upvotes;

            // If the post is heavily downvoted
            if (downvotes >= Math.max(5, upvotes)) {
                await msg.delete();
                await prisma.poll.delete({ where: { id: poll.id } });
                return;
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

            await ctx.editReply({ components: [actionRow] });

            await F.wait(1000);

            upvoteButton.setStyle("SECONDARY");
            downvoteButton.setStyle("SECONDARY");

            await ctx.editReply({ components: [actionRow] });
        });

        const createActionRow = async (ctx: SlashCommandInteraction<T> | Message, title?: string) => {
            const poll = await prisma.poll.create({
                data: {
                    userId: ctx.member?.id,
                    name: title || `${name}-${Date.now()}`,
                    options: ["downvote", "upvote"]
                }
            });
            return new MessageActionRow().addComponents([
                new MessageButton({
                    emoji: emojiIDs.upvote,
                    style: "SECONDARY",
                    label: "0",
                    customId: gen({ isUpvote: "1", pollID: `${poll.id}` })
                }),
                new MessageButton({
                    emoji: emojiIDs.downvote,
                    style: "SECONDARY",
                    label: "0",
                    customId: gen({ isUpvote: "0", pollID: `${poll.id}` })
                })
            ]);
        };

        return createActionRow;
    }

    static getIdentifierFromInteraction(interaction: CommandInteraction): string {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);

        return [interaction.commandName, subcommandGroup, subcommand].filter((s) => s).join(":");
    }
}
