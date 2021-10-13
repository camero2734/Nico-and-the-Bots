import { guildID, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { updateUserScore } from "../../../Helpers";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    await ctx.editReply({ content: "ok" });
});

export default command;
