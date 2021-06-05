import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageAttachment, MessageEmbed } from "discord.js";
import F from "helpers/funcs";
import fetch from "node-fetch";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    // ctx.send({ embeds: [embed.toJSON()] });
};
