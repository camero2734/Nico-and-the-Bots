## Slash Commands

This folder contains the most common entry point for user interactions - slash commands. Each slash command registers a handler that is triggered when a user uses the command (e.g. sends a message saying `/ping`).

A slash command can (optionally) register InteractionListeners to allow for back-and-forth communication with the user through Buttons, Select Menus, etc.

Slash command files are automatically imported and restructured as necessary for the Discord API based on the folder structure. For example, the `ban.ts` file in the `staff` folder is able to be used via `/staff ban`.

All commands follow the same base structure:

```ts
import { SlashCommand } from "../helpers/slash-command";

const command = new SlashCommand(<const>{
    description: "Checks the bot's ping",
    options: [
        {
            name: "kangaroo",
            description: "The description of the option",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    // ... Some command logic

    // Through some Typescript magic, Typescript correctly types the ctx.opts object
    const { kangaroo } = ctx.opts; // kangaroo is string | undefined (because it's not required, it can be undefined)

    await ctx.send(/* Some content */);
});

export default command;
```
