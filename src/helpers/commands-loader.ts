import { Command } from "configuration/definitions";
import * as fs from "fs";

/**
 * Loads all command modules from ./commands
 * @param commands Command array to populate
 */
export const loadCommands = async function (commands: Command[]) {
    const files = await fs.promises.readdir("./src/commands");
    for (const file of files) {
        const command = (await import(`commands/${file}`)).default as Command;
        if (typeof command.name !== "string") {
            console.log(`Malformed command: ${file}`);
        } else commands.push(command);
    }
};
