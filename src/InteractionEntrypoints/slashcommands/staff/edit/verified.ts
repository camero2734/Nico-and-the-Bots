import { ApplicationCommandOptionType } from "discord.js";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Edits a user's economy",
    options: [
        {
            name: "user",
            description: "The user to modify",
            required: true,
            type: ApplicationCommandOptionType.User
        },
        {
            name: "action",
            description: "The action to perform",
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "Reset timer", value: "RESET_TIMER" },
                { name: "Ban", value: "BAN" }
            ]
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const { user, action } = ctx.opts;

    if (action === "BAN") {
        await ctx.editReply({ content: "Banning users from retaking the verified quiz is not yet supported." });
        return;
    }

    if (action === "RESET_TIMER") {
        await prisma.verifiedQuiz.update({
            where: { userId: user },
            data: { lastTaken: new Date(0) }
        });
        await ctx.editReply({ content: "User's verified quiz timer has been reset." });
    }
});

export default command;
