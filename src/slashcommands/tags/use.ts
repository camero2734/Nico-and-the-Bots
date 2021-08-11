import { CommandError } from "../../configuration/definitions";
import { MessageEmbed } from "discord.js";
import { prisma } from "../../helpers/prisma-init";
import { ExtendedInteraction, SlashCommand } from "../../helpers/slash-command";

const command = new SlashCommand({
    description: "Uses or searches for a tag",
    options: [{ name: "name", description: "The name of the tag to use", required: false, type: "STRING" }]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const tag = await prisma.tag.findUnique({ where: { name: ctx.opts.name } });
    if (!tag?.userId) return sendSuggestionList(ctx);

    const tagAuthor = await ctx.guild?.members.fetch(tag.userId.toSnowflake());
    if (!tagAuthor) throw new CommandError("The user that created this tag no longer exists");

    const embed = new MessageEmbed()
        .setTitle(tag.name)
        .setDescription(tag.text)
        .setColor(tagAuthor.displayColor)
        .setFooter(`Created by ${tagAuthor.displayName}`, tagAuthor.user.displayAvatarURL());

    // Increase # of uses
    await prisma.tag.update({
        where: { name: tag.name },
        data: { uses: { increment: 1 } }
    });

    await ctx.send({ embeds: [embed.toJSON()] });
});

// TODO: Send a drop down list that sends the selected one
async function sendSuggestionList(ctx: ExtendedInteraction): Promise<void> {
    const tags = await prisma.tag.findMany({ orderBy: { uses: "desc" }, take: 10 });

    const embed = new MessageEmbed().setTitle(
        "That tag doesn't exist. Here are some of the most popular tags you can try."
    );

    for (const tag of tags) {
        embed.addField(tag.name, `Uses: ${tag.uses}`);
    }

    await ctx.send({ embeds: [embed.toJSON()] });
}

export default command;
