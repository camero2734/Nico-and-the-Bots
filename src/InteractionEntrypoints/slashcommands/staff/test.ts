import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { runDropInChannel } from "../../messageinteractions/randomDrop";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    if (ctx.user.id !== userIDs.me) return;

    runDropInChannel(ctx.channel);

    await ctx.editReply({ content: "ok" });
});

export default command;
