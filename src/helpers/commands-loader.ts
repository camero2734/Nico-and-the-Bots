import {
    Command,
    CommandComponentListener,
    CommandOption,
    CommandOptions,
    CommandReactionHandler,
    CommandRunner,
    GeneralCommandRunner,
    SubcommandRunner
} from "configuration/definitions";
import * as fs from "fs";
import { join, resolve, sep } from "path";
import { CommandOptionType, SlashCreator } from "slash-create";

async function getFilesRecursive(dir: string): Promise<string[]> {
    const subdirs = await fs.promises.readdir(dir);
    const files = await Promise.all(
        subdirs.map(async (subdir) => {
            const res = resolve(dir, subdir);
            return (await fs.promises.stat(res)).isDirectory() ? getFilesRecursive(res) : res;
        })
    );
    return files.flat();
}

/**
 * Loads all command modules from ./commands
 * @param commands - Command array to populate
 * @param reactionHandlers - Reaction handlers array to populate
 * @param interactionHandlers - Interaction handlers array to populate
 */
export const loadCommands = async function (
    commands: Command<CommandOption, GeneralCommandRunner>[],
    reactionHandlers: CommandReactionHandler[],
    interactionHandlers: CommandComponentListener[],
    creator: SlashCreator
): Promise<void> {
    const commandsPath = join(__dirname, "../slashcommands");
    const fileNames = await getFilesRecursive(commandsPath);
    const filePaths = fileNames.map(f => f.replace(commandsPath, "").split(sep).filter(a => a)); // prettier-ignore

    const subCommands: Record<string, string | Record<string, string>> = {};

    // Put the files into a nice hierarchical format for subcommand purposes
    for (let i = 0; i < filePaths.length; i++) {
        const file = fileNames[i];
        const fp = filePaths[i];

        const fileName = fp[fp.length - 1];

        // Ignore files that start with _ (they just contain shared definitions)
        if (fileName.startsWith("_")) continue;

        const commandName = fileName.split(".")[0];

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
            const {
                Executor,
                Options,
                ReactionHandler,
                ComponentListeners
            }: {
                Executor: CommandRunner;
                Options: CommandOptions;
                ReactionHandler?: CommandReactionHandler;
                ComponentListeners?: CommandComponentListener[];
            } = await import(value);

            if (ReactionHandler) reactionHandlers.push(ReactionHandler);
            if (ComponentListeners) interactionHandlers.push(...ComponentListeners);

            const command = new Command(creator, key, Options, value, Executor);
            command.onError = console.log;
            commands.push(command);
        } else {
            // Subcommand
            const options: CommandOptions = { description: key, options: [] };

            const SubcommandExecutor: SubcommandRunner = {};

            for (const [subcommand, fileName] of Object.entries(value)) {
                const {
                    Executor,
                    Options,
                    ReactionHandler,
                    ComponentListeners
                }: {
                    Executor: CommandRunner;
                    Options: CommandOptions;
                    ReactionHandler?: CommandReactionHandler;
                    ComponentListeners?: CommandComponentListener[];
                } = await import(fileName);
                options.options?.push({
                    ...Options,
                    name: subcommand,
                    type: CommandOptionType.SUB_COMMAND
                });

                if (ReactionHandler) reactionHandlers.push(ReactionHandler);
                if (ComponentListeners) interactionHandlers.push(...ComponentListeners);
                SubcommandExecutor[subcommand] = Executor;
            }

            const command = new Command(creator, key, options, "", SubcommandExecutor);
            command.onError = console.log;

            commands.push(command);
        }
    }
};
