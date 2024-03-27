import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { cron, songBattleCron } from "../../scheduled/songbattle";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    // await districtCron();

    await ctx.deferReply({ ephemeral: true });

    const run = cron.nextRun();
    if (!run) throw new CommandError("No next run found");

    await ctx.editReply(`Next run: ${F.discordTimestamp(run, "relative")}`);

    await songBattleCron();
});

export default command;
