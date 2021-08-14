/* eslint-disable @typescript-eslint/no-explicit-any */
import { glob as g } from "glob";
import path from "path";
import { promisify } from "util";
import { InteractionEntrypoint } from "../structures/EntrypointBase";
import { ContextMenu } from "../structures/EntrypointContextMenu";
import { SlashCommand } from "../structures/EntrypointSlashCommand";

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
    const paths = await getAllFilesRecursive("dist/src/InteractionEntrypoints/slashcommands");

    const slashCommands = (
        await Promise.all(
            paths.map(async (path) => {
                try {
                    const slashCommand = (await import(`file:///${path.full}`)).default.default;
                    if (!(slashCommand instanceof SlashCommand)) return null;
                    return [path, slashCommand];
                } catch {
                    return null;
                }
            })
        )
    ).filter((cmd): cmd is [Path, SlashCommand] => cmd !== null);

    return slashCommands;
}

async function getAllContextMenus(): Promise<[Path, ContextMenu<any>][]> {
    const paths = await getAllFilesRecursive("dist/src/InteractionEntrypoints/contextmenus");

    const contextMenus = (
        await Promise.all(
            paths.map(async (path) => {
                try {
                    const contextMenu = (await import(`file:///${path.full}`)).default.default;
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

export async function registerAllEntrypoints() {
    const slashCommands = await getAllSlashCommands();
    const contextMenus = await getAllContextMenus();

    const entrypoints: [Path, InteractionEntrypoint<any, any>][] = [...slashCommands, ...contextMenus];

    for (const [path, entrypoint] of entrypoints) {
        entrypoint.register(path.parts);
    }
}
