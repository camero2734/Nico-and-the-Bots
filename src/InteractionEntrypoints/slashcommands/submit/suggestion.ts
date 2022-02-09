import { channelIDs } from "../../../Configuration/config";
import { Embed, TextChannel } from "discord.js/packages/discord.js";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Submits a suggestion to the staff",
    options: [
        {
            name: "title",
            description: "The title of your suggestion",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "details",
            description: "Some more details about your suggestion",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    const { title, details } = ctx.opts;

    const embed = new Embed()
        .setAuthor(`Suggestion from ${ctx.member.displayName}`, ctx.member.user.displayAvatarURL())
        .setColor(ctx.member.displayColor)
        .setTitle(title)
        .setDescription(details);

    const suggestChan = ctx.member.guild.channels.cache.get(channelIDs.submittedsuggestions) as TextChannel;

    await suggestChan.send({ embeds: [embed] });

    const responseEmbed = new Embed({ description: "Your suggestion has been submitted!" });
    await ctx.send({ embeds: [responseEmbed] });
});

export default command;
