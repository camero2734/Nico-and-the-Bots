import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { subHours } from "date-fns";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { Economy } from "../../database/entities/Economy";

export const Options = createOptions(<const>{
    description: "Presents a list of your reminders",
    options: []
});

export const Executor: CommandRunner = async (ctx) => {
    await ctx.defer();
};
1;
