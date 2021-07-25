/** There are three types of usable commands:
 * 1. Commands
 * 2. Command > Subcommand
 * 3. Command > Subcommand Group > Subcommand
 *
 * so the max nest level is 3
 */

import { InteractionListener, ListenerCustomIdGenerator, SlashCommand, SlashCommandData } from "./slash-command";
import { join, resolve, sep } from "path";
import * as fs from "fs";
import { ApplicationCommandData, Guild } from "discord.js";
import { Collection } from "discord.js";
import { GuildApplicationCommandPermissionData } from "discord.js";
import { guildID, userIDs } from "../configuration/config";

const basePath = join(__dirname, "../slashcommands");

async function readDirectory(path: string): Promise<string[]> {
    try {
        const directoryFiles = await fs.promises.readdir(path);
        return directoryFiles.map((fileOrFolder) => resolve(path, fileOrFolder));
    } catch (e) {
        return [];
    }
}

// Step 1: Walk the file structure to extract SlashCommands and their path
type ParsedFile = {
    topName: string;
    depth: number;
    files: { name: string; subcommandName: string; command: SlashCommand }[];
};
async function parseCommandFolderStructure(): Promise<ParsedFile[]> {
    const parsedFiles: ParsedFile[] = [];
    let currentNodes = await readDirectory(basePath);

    let maxDepth = 3;
    while (currentNodes.length !== 0 && maxDepth-- > 0) {
        const result = await Promise.all(
            currentNodes.map(async (path) => {
                const isDirectory = (await fs.promises.stat(path)).isDirectory();
                if (!isDirectory) {
                    const slashCommand = (await import(path)).default;
                    if (!slashCommand || !(slashCommand instanceof SlashCommand)) return [];

                    const parts = path.split(sep).reverse();
                    const [name, parentName, grandparentName] = parts
                        .slice(0, 3 - maxDepth)
                        .map((p) => p.split(".")[0].trim());
                    const topName = grandparentName || parentName || name;
                    const subcommandName = grandparentName ? parentName : "";
                    const existingParsed = parsedFiles.find((p) => p.topName === topName);
                    slashCommand.commandIdentifier = [name, parentName, grandparentName].filter((n) => n).join(":");
                    if (existingParsed) existingParsed.files.push({ name, subcommandName, command: slashCommand });
                    else
                        parsedFiles.push({
                            topName,
                            depth: 3 - maxDepth,
                            files: [{ name, subcommandName, command: slashCommand }]
                        });
                    return [];
                } else return await readDirectory(path);
            })
        );
        currentNodes = result.flat();
    }

    return parsedFiles;
}

// Step 2: Construct the *actual* command data to be sent to Discord
async function generateCommandData(parsedFile: ParsedFile): Promise<[ApplicationCommandData, SlashCommand[]]> {
    const nestingDepth = parsedFile.depth as 1 | 2 | 3;
    if (nestingDepth === 1) {
        return [
            {
                ...parsedFile.files[0].command.commandData,
                name: parsedFile.files[0].name // Use file name for name
            },
            [parsedFile.files[0].command]
        ];
    }
    if (nestingDepth === 2) {
        return [
            {
                name: parsedFile.topName,
                description: parsedFile.topName,
                options: [
                    ...parsedFile.files.map(
                        (p) =>
                            <const>{
                                ...p.command.commandData,
                                type: "SUB_COMMAND",
                                name: p.name
                            }
                    )
                ]
            },
            parsedFile.files.map((f) => f.command)
        ];
    }

    const commandData: SlashCommandData & { name: string } = {
        name: parsedFile.topName,
        description: parsedFile.topName,
        options: []
    };

    const subcommandsSet = new Set<string>();
    for (const file of parsedFile.files) subcommandsSet.add(file.subcommandName);
    const subcommands = [...subcommandsSet];

    const slashCommands: SlashCommand[] = [];

    for (const subcommand of subcommands) {
        const relevantCommands = parsedFile.files.filter((f) => f.subcommandName === subcommand);
        slashCommands.push(...relevantCommands.map((c) => c.command));
        commandData.options.push({
            name: subcommand,
            description: subcommand,
            type: "SUB_COMMAND_GROUP",
            options: [
                ...relevantCommands.map(
                    (p) =>
                        <const>{
                            ...p.command.commandData,
                            type: "SUB_COMMAND",
                            name: p.name
                        }
                )
            ]
        });
    }

    return [commandData, slashCommands];
}

// Step 3: Wrap it all up
export async function setupAllCommands(
    guild: Guild
): Promise<[Collection<string, SlashCommand<[]>>, Collection<string, InteractionListener>]> {
    const parsedFiles = await parseCommandFolderStructure();
    const dataFromCommands: ApplicationCommandData[] = [];
    const allSlashCommands: SlashCommand[] = [];

    for (const file of parsedFiles) {
        const [commandData, slashCommands] = await generateCommandData(file);
        dataFromCommands.push(commandData);
        allSlashCommands.push(...slashCommands);
    }

    // Set guild commands
    const savedData = await guild.commands.set(dataFromCommands.map((p) => ({ ...p, defaultPermission: false })));

    const slashCommandCollection = new Collection<string, SlashCommand>();
    let intListenerCollection = new Collection<string, InteractionListener>();

    for (const slashCommand of allSlashCommands) {
        slashCommandCollection.set(slashCommand.commandIdentifier, slashCommand);
        intListenerCollection = intListenerCollection.concat(slashCommand.interactionListeners);
    }

    const fullPermissions: GuildApplicationCommandPermissionData[] = savedData.map((s) => ({
        id: s.id,
        permissions: [
            {
                id: userIDs.me,
                type: "USER",
                permission: true
            }
        ]
    }));

    await guild.commands.permissions.set({ fullPermissions });

    return [slashCommandCollection, intListenerCollection];
}
