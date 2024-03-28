import { ApplicationCommandOptionType } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";

const command = new SlashCommand({
    description: "Test command",
    options: [{
        name: "num",
        description: "Number of times to test",
        required: true,
        type: ApplicationCommandOptionType.Integer
    }]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    // await districtCron();

    await ctx.deferReply({ ephemeral: true });

    // Concert channels
    const concertChannelManager = getConcertChannelManager(ctx.guild);
    await concertChannelManager.initialize(ctx.opts.num);
    await concertChannelManager.checkChannels();

    await ctx.editReply("Done");
});

export default command;
