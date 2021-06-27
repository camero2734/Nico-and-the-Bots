import { CommandOptions, CommandRunner } from "configuration/definitions";
import { MessageAttachment, MessageEmbed, Snowflake } from "discord.js";
import F from "helpers/funcs";
import fetch from "node-fetch";
import R from "ramda";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    //
};
