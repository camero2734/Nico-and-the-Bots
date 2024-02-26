import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { songBattleCron } from "../../scheduled/songbattle";

const command = new SlashCommand(<const>{
    description: "Test command for song battles",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true })

    if (ctx.user.id !== userIDs.me) throw new CommandError("No.");

    await songBattleCron();
    await ctx.editReply("OK.");
});

export default command;
