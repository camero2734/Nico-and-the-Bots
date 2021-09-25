import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    //
});

export default command;
