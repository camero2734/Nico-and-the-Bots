import { ApplicationCommandOptionType } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../../Helpers/concert-channels";

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
    const concertManager = getConcertChannelManager(ctx.guild);
    await concertManager.fetchConcerts(ctx.opts.num);
    await concertManager.checkChannels();

    await ctx.editReply("Done");
});

export default command;
