import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { channelIDs } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Submits a theory to #theory-list",
    options: [
        {
            name: "title",
            description: "The title of your theory",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "theory",
            description: "Your theory in text form",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "imageurl",
            description: "A direct link to a supporting image",
            required: false,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    const { title, theory, imageurl } = ctx.opts;

    const embed = new EmbedBuilder()
        .setAuthor({ name: ctx.member.displayName, iconURL: ctx.member.user.displayAvatarURL() })
        .setColor(ctx.member.displayColor)
        .setTitle(title)
        .setDescription(theory)
        .setFooter({
            text: "Use the buttons below to vote on the theory. Votes remain anonymous and should reflect the quality of the post."
        });

    if (imageurl) embed.setImage(imageurl);

    const theoryChan = ctx.member.guild.channels.cache.get(channelIDs.theorylist) as TextChannel;

    const actionRow = await genActionRow(ctx, title);

    const m = await theoryChan.send({ embeds: [embed], components: [actionRow] });

    const responseEmbed = new EmbedBuilder({ description: "Your theory has been submitted!" });
    const responseActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        [new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(m.url).setLabel("View post")]
    );
    await ctx.send({
        embeds: [responseEmbed],
        components: [responseActionRow]
    });
});

const genActionRow = command.upvoteDownVoteListener("theorysub");

export default command;
