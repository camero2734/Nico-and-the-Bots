import path from "node:path";
import { promisify } from "node:util";
import { glob as g } from "glob";
import type { InteractionEntrypoint } from "../Structures/EntrypointBase";
import { ContextMenu, type TargetTypes } from "../Structures/EntrypointContextMenu";
import { ManualEntrypoint } from "../Structures/EntrypointManual";
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
          const slashCommand = (await import(`${path.full}`)).default;
          if (!(slashCommand instanceof SlashCommand)) return null;

          return [path, slashCommand];
        } catch (e) {
          console.log(e, /ENTRYPOINT_LOAD_ERR/);
          return null;
        }
      }),
    )
  ).filter((cmd): cmd is [Path, SlashCommand] => cmd !== null);

  return slashCommands;
}

async function getAllContextMenus(): Promise<[Path, ContextMenu<keyof TargetTypes>][]> {
  const paths = await getAllFilesRecursive("src/InteractionEntrypoints/contextmenus");

  const contextMenus = (
    await Promise.all(
      paths.map(async (path) => {
        try {
          const contextMenu = (await import(`${path.full}`)).default;
          if (!(contextMenu instanceof ContextMenu)) return null;
          return [path, contextMenu];
        } catch {
          return null;
        }
      }),
    )
  ).filter((cmd): cmd is [Path, ContextMenu<keyof TargetTypes>] => cmd !== null);

  return contextMenus;
}

async function getAllManualEntrypoints(): Promise<[Path, ManualEntrypoint][]> {
  const paths = [
    ...(await getAllFilesRecursive("src/InteractionEntrypoints/messageinteractions")),
    ...(await getAllFilesRecursive("src/InteractionEntrypoints/scheduled")),
  ];

  const msgInteractions = (
    await Promise.all(
      paths.map(async (path) => {
        try {
          const msgInteraction = (await import(`${path.full}`)).default;
          if (!(msgInteraction instanceof ManualEntrypoint)) return null;
          return [path, msgInteraction];
        } catch {
          return null;
        }
      }),
    )
  ).filter((cmd): cmd is [Path, ManualEntrypoint] => cmd !== null);

  return msgInteractions;
}

export async function registerAllEntrypoints() {
  const slashCommands = await getAllSlashCommands();
  const contextMenus = await getAllContextMenus();
  const msgInteractions = await getAllManualEntrypoints();

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const entrypoints: [Path, InteractionEntrypoint<any, any>][] = [
    ...slashCommands,
    ...contextMenus,
    ...msgInteractions,
  ];

  for (const [path, entrypoint] of entrypoints) {
    entrypoint.register(path.parts);
  }

  return entrypoints;
}
