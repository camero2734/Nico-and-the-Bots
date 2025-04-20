import { ApplicationCommandOptionType } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Submits a suggestion to the staff",
    options: [
        {
            name: "image",
            description: "Some more details about your suggestion",
            required: true,
            type: ApplicationCommandOptionType.Attachment
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const { image } = ctx.opts;

    if (ctx.user.id !== userIDs.me) throw new CommandError("Under construction");

    const img = ctx.options.getAttachment("image");
    if (!img) throw new CommandError("No image found");

    const type = typeof image;
    const constructor = image?.constructor?.name;

    const stringified = JSON.stringify(img, null, 2);

    await ctx.editReply({
        content: `Type: ${type}\n\nConstructor: ${constructor}\n\nStringified:\n${stringified}`
    })
});

export default command;
