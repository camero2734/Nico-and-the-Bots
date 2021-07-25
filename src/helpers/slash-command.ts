import {
    ApplicationCommandData,
    ApplicationCommandOptionChoice,
    ApplicationCommandOptionData,
    ButtonInteraction,
    CommandInteraction,
    Message,
    MessageOptions,
    SelectMenuInteraction,
    Snowflake
} from "discord.js";
import R from "ramda";

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
export type ExtendedInteraction<T extends CommandOptions> = BaseInteraction & {
    send(payload: MessageOptions): Promise<Message | void>;
    opts: OptsType<SlashCommandData<T>>;
};

type SlashCommandHandler<T extends CommandOptions> = (ctx: ExtendedInteraction<T>) => Promise<void>;

type ListenerCustomIdGenerator = () => void;

export class SlashCommand<T extends CommandOptions = []> {
    #handler: SlashCommandHandler<T>;
    public commandIdentifier: string;
    constructor(public commandData: SlashCommandData<T>) {}
    setHandler(handler: SlashCommandHandler<T>): this {
        this.#handler = handler;
        return this;
    }
    async run(interaction: BaseInteraction, opts?: OptsType<SlashCommandData<T>>): Promise<void> {
        try {
            if (!this.#handler) throw new Error("Invalid command handler");
            const ctx = interaction as ExtendedInteraction<T>;
            ctx.send = async (payload) => {
                if (ctx.replied || ctx.deferred) return ctx.editReply(payload) as Promise<Message>;
                else return ctx.reply(payload);
            };
            ctx.opts = opts || extractOptsFromInteraction(interaction as CommandInteraction);
            await this.#handler(ctx);
        } catch (e) {
            // Handle
        }
    }
    addInteractionListener(name: string, interactionHandler: () => void): ListenerCustomIdGenerator {
        return interactionHandler;
    }
    getMutableCommandData(): ApplicationCommandData {
        return R.clone(this.commandData) as unknown as ApplicationCommandData;
    }
    static getIdentifierFromInteraction(interaction: CommandInteraction): string {
        const subcommand = interaction.options.find((o) => o.type === "SUB_COMMAND");
        if (!subcommand) return interaction.commandName;
        else return `${subcommand.name}:${interaction.commandName}`;
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
