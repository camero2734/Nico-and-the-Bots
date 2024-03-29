import { ApplicationCommandData } from "discord.js";
import { InteractionEntrypoint } from "./EntrypointBase";

// This only exists as a nice way of adding interaction listeners that aren't attached to a specific command/context menu/whatever
type ManualHandler = () => Promise<void>;
export class ManualEntrypoint extends InteractionEntrypoint<ManualHandler> {
    public commandData: ApplicationCommandData;

    async _run(): Promise<void> {
        return;
    }

    _register(): string {
        return "";
    }
}
