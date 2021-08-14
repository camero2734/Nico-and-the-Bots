/**
 *  Extracts the type for opts so they don't have to be manually typed
 */

import {
    ApplicationCommandChoicesData,
    ApplicationCommandData,
    ApplicationCommandOptionChoice,
    ApplicationCommandOptionData,
    CommandInteraction,
    CommandInteractionOption,
    Snowflake
} from "discord.js";

export type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};

type ApplicationDataType = ApplicationCommandOptionData & Pick<ApplicationCommandChoicesData, "choices">;

export type CommandOptions = DeepReadonly<ApplicationDataType[]>;
// prettier-ignore
export type SlashCommandData<T extends CommandOptions = ApplicationDataType[]> = Omit<ApplicationCommandData, "options" | "name"> & {
    description: string;
    options: T;
};

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

export type OptsType<T> = T extends SlashCommandData<infer U> ? UnionToIntersection<ToObjectsArray<U>[number]> : never;

export function extractOptsFromInteraction(interaction: CommandInteraction): unknown {
    let arr = interaction.options.data as CommandInteractionOption[];
    const opts: Record<string, unknown> = {};
    while (arr.length !== 0) {
        const newArr: typeof arr = [];
        for (const option of arr) {
            if (option.options?.length) {
                newArr.push(...option.options);
                continue;
            }
            opts[option.name] = option.value;
        }
        arr = newArr;
    }
    return opts;
}
