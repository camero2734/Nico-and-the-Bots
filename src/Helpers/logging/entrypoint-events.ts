import { EntrypointEvents } from "../../Structures/Events";

EntrypointEvents.on("entrypointCompleted", ({ entrypoint, ctx }) => {
    const commandName = entrypoint.identifier;
    // TODO: Write to database or something
});
