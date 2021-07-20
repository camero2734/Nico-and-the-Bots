import { PrismaClient } from "@prisma/client";
import { CommandOptions, CommandRunner } from "configuration/definitions";
import { Economy } from "../../database/entities/Economy";

export const Options: CommandOptions = {
    description: "Test command",
    options: []
};

export const Executor: CommandRunner = async (ctx) => {
    //
};
