import { roles } from "configuration/config";
import { Command, CommandOptions, CommandRunner, GeneralCommandRunner, SubcommandRunner } from "configuration/definitions";
import { GuildMember, Message } from "discord.js";
import * as path from "path"
import {promisify} from "util";
import {resolve, join, sep} from "path";
import * as fs from "fs";
import { CommandOptionType, SlashCreator } from "slash-create";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFiles(dir: string): Promise<string[]> {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = resolve(dir, subdir);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return files.flat();
}


/**
 * Loads all command modules from ./commands
 * @param commands Command array to populate
 */
export const loadCommands = async function (commands: Command<GeneralCommandRunner>[], creator: SlashCreator): Promise<void> {
    const commandsPath = join(__dirname, "../slashcommands");
    const fileNames = await getFiles(commandsPath);
    const filePaths = fileNames.map(f => f.replace(commandsPath, "").split(sep).filter(a => a));

    const subCommands: Record<string, string | Record<string, string>> = {};

    // Put the files into a nice hierarchical format for subcommand purposes
    for (let i = 0; i < filePaths.length; i++) {
        const file = fileNames[i];
        const fp = filePaths[i];

        const commandName = fp[fp.length - 1].split(".")[0];

        if (fp.length === 1) subCommands[commandName] = file;
        else if (fp.length === 2) {
            const categoryName = fp[fp.length - 2];
            if (!subCommands[categoryName]) subCommands[categoryName] = {};
            const category = subCommands[categoryName] as Record<string, string>;
            category[commandName] = file;
        } else throw new Error("Only sub commands with a depth of 1 are currently supported");
    }
    
    // Create commands
    for (const [key, value] of Object.entries(subCommands)) {
        if (typeof value === "string") {
            // Single command
            const { Executor, Options }: {Executor: CommandRunner, Options: CommandOptions}  = await import(value);
            commands.push(new Command(creator, key, Options, value, Executor));
        } else {
            // Subcommand
            const options: CommandOptions = {description: key, options: []};
            
            const SubcommandExecutor: SubcommandRunner = {};

            for (const [subcommand, fileName] of Object.entries(value)) {
                const { Executor, Options }: {Executor: CommandRunner, Options: CommandOptions}  = await import(fileName);
                options.options?.push({ ...Options, name: subcommand, type: CommandOptionType.SUB_COMMAND});
                SubcommandExecutor[subcommand] = Executor;
            }

            console.log(options, /SUBCOMMAND_GROUP/);
            commands.push(new Command(creator, key, options, value["help"], SubcommandExecutor));
        }
    }
};
