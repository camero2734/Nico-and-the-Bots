import { CommandError, CommandRunner, createOptions, extendContext, OptsType } from "../../configuration/definitions";
import {
    CommandContext,
    CommandMember,
    CommandOptionType,
    InteractionRequestData,
    InteractionType
} from "slash-create";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";
import * as jail from "./jail";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: [
        {
            name: "user",
            description: "User",
            required: false,
            type: "USER"
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.send({content: "Hello"});
});

export default command;
