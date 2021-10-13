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

    const msg = await F.fetchMessageFromUrl(
        "https://discord.com/channels/269657133673349120/827679833487704094/897619370845569024",
        ctx.guild
    );

    if (!msg) throw new CommandError("No msg");

    updateUserScore(msg);

    await ctx.editReply({ content: "ok" });
});

export default command;
