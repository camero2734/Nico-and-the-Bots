import { channelIDs } from "../../configuration/config";
import { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { SlashCommand } from "../../structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Submits a theory to #theory-list",
    options: [
        { name: "title", description: "The title of your theory", required: true, type: "STRING" },
        { name: "theory", description: "Your theory in text form", required: true, type: "STRING" },
        {
            name: "imageurl",
            description: "A direct link to a supporting image",
            required: false,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    const { title, theory, imageurl } = ctx.opts;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .setColor(ctx.member.displayColor)
        .setTitle(title)
        .setDescription(theory)
        .setFooter(
            "Use the buttons below to vote on the theory. Votes remain anonymous and should reflect the quality of the post."
        );

    if (imageurl) embed.setImage(imageurl);

    const theoryChan = ctx.member.guild.channels.cache.get(channelIDs.theorylist) as TextChannel;

    const actionRow = await genActionRow(ctx, title);

    const m = await theoryChan.send({ embeds: [embed], components: [actionRow] });

    const responseEmbed = new MessageEmbed({ description: "Your theory has been submitted!" });
    const responseActionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", url: m.url, label: "View post" })
    ]);
    await ctx.send({
        embeds: [responseEmbed],
        components: [responseActionRow]
    });
});

const genActionRow = command.upvoteDownVoteListener("theorysub");

export default command;
