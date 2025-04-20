import { ApplicationCommandOptionType, Attachment, EmbedBuilder } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Submits a suggestion for a #shirt-discussion announcement",
    options: [
        {
            name: "description",
            description: "The body of the potential announcement",
            required: true,
            type: ApplicationCommandOptionType.String,
        },
        {
            name: "image1",
            description: "Attach any relevant image(s)",
            required: false,
            type: ApplicationCommandOptionType.Attachment
        },
        {
            name: "image2",
            description: "Attach any additional image(s)",
            required: false,
            type: ApplicationCommandOptionType.Attachment
        },
        {
            name: "image3",
            description: "Attach any additional image(s)",
            required: false,
            type: ApplicationCommandOptionType.Attachment
        },
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });
    if (ctx.user.id !== userIDs.me) throw new CommandError("Under construction");

    const { description } = ctx.opts;

    const [firstImage, ...restImages] = [
        ctx.options.getAttachment("image1"),
        ctx.options.getAttachment("image2"),
        ctx.options.getAttachment("image3"),
    ].filter((img): img is Attachment => !!img);

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setURL("https://archive.demacouncil.top")
        .setAuthor({
            name: ctx.user.displayName,
            iconURL: ctx.user.displayAvatarURL(),
        })
        .setDescription(description)
        .setImage(firstImage?.url)
        .setFooter({ text: "Submitted with the /submit shirt command" });

    const restEmbeds = restImages.map((img) =>
        new EmbedBuilder()
            .setURL("https://archive.demacouncil.top")
            .setImage(img.url)
    );

    await ctx.editReply({
        content: "Your suggestion has been submitte.",
    });

    await ctx.followUp({
        embeds: [embed, ...restEmbeds],
    })
});

export default command;
