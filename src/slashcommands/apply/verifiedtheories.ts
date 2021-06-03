import { roles } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner, ExtendedContext } from "configuration/definitions";
import { DMChannel, EmbedField, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { MessageTools } from "helpers/message-tools";
import { ComponentActionRow, ComponentContext } from "slash-create";

export const Options: CommandOptions = {
    description: "Opens an application for the verified-theories channel",
    options: []
};

export const Executor: CommandRunner<{ code: string }> = async (ctx) => {
    //
};
