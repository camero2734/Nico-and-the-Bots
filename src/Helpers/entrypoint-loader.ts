/* eslint-disable @typescript-eslint/no-explicit-any */
import { glob as g } from "glob";
import path from "path";
import { promisify } from "util";
import { ApplicationData } from "../Structures/data";
import { InteractionEntrypoint } from "../Structures/EntrypointBase";
import { ContextMenu } from "../Structures/EntrypointContextMenu";
import { MessageInteraction } from "../Structures/EntrypointMessageInteraction";
import { SlashCommand } from "../Structures/EntrypointSlashCommand";

const glob = promisify(g);

type Path = { full: string; parts: string[] };

async function getAllFilesRecursive(pathStr: string): Promise<Path[]> {
    const endings = ["ts", "js"];
    const globEndings = endings.join("|");

    const res = await glob(`${pathStr}/**/*.@(${globEndings})`);
    return res.map((r) => {
        const full = path.join(process.cwd(), r);
        const parts = r
            .replace(`${pathStr}/`, "")
            .split("/")
            .map((part) => part.replace(new RegExp(`\\.(${globEndings})`), ""));
        return { full, parts };
    });
}

async function getAllSlashCommands(): Promise<[Path, SlashCommand][]> {
    const paths = await getAllFilesRecursive("src/InteractionEntrypoints/slashcommands");

    const slashCommands = (
        await Promise.all(
            paths.map(async (path) => {
                try {
                    const imported = (await import(`${path.full}`));
                    const slashCommand = imported.default;
                    if (!(slashCommand instanceof SlashCommand)) return null;

                    return [path, slashCommand];
                } catch (e) {
                    console.log(e, /ENTRYPOINT_LOAD_ERR/);
                    return null;
                }
            })
        )
    ).filter((cmd): cmd is [Path, SlashCommand] => cmd !== null);

    return slashCommands;
}

async function getAllContextMenus(): Promise<[Path, ContextMenu<any>][]> {
    const paths = await getAllFilesRecursive("src/InteractionEntrypoints/contextmenus");

    const contextMenus = (
        await Promise.all(
            paths.map(async (path) => {
                try {
                    const contextMenu = (await import(`${path.full}`)).default.default;
                    if (!(contextMenu instanceof ContextMenu)) return null;
                    return [path, contextMenu];
                } catch {
                    return null;
                }
            })
        )
    ).filter((cmd): cmd is [Path, ContextMenu<any>] => cmd !== null);

    return contextMenus;
}

async function getAllMessageInteractions(): Promise<[Path, MessageInteraction][]> {
    const paths = await getAllFilesRecursive("src/InteractionEntrypoints/messageinteractions");

    const msgInteractions = (
        await Promise.all(
            paths.map(async (path) => {
                try {
                    const msgInteraction = (await import(`${path.full}`)).default.default;
                    if (!(msgInteraction instanceof MessageInteraction)) return null;
                    return [path, msgInteraction];
                } catch {
                    return null;
                }
            })
        )
    ).filter((cmd): cmd is [Path, MessageInteraction] => cmd !== null);

    return msgInteractions;
}

export async function registerAllEntrypoints() {
    const slashCommands = await getAllSlashCommands();
    const contextMenus = await getAllContextMenus();
    const msgInteractions = await getAllMessageInteractions();

    const entrypoints: [Path, InteractionEntrypoint<any, any>][] = [
        ...slashCommands,
        ...contextMenus,
        ...msgInteractions
    ];

    for (const [path, entrypoint] of entrypoints) {
        entrypoint.register(path.parts);
    }
}
