import { ApplicationCommandOptionType } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { runDropInChannel } from "../../messageinteractions/randomDrop";

const command = new SlashCommand(<const>{
    description: "Test command",
    options: [
        {
            name: "time",
            description: "Time for slowmode in seconds. 0 = off",
            required: true,
            type: 11
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    if (ctx.user.id !== userIDs.me) return;

    // runDropInChannel(ctx.channel);

    // console.log(ctx);

    await ctx.editReply({ content: "ok" });
});

export default command;
