import { userIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { districtCron } from "../../scheduled/districts";

const command = new SlashCommand({
    description: "Test command",
    options: []
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await districtCron();
});

export default command;
