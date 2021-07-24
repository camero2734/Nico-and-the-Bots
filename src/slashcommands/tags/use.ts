import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { prisma } from "../../helpers/prisma-init";

export const Options = createOptions(<const>{
    description: "Uses or searches for a tag",
    options: [
        { name: "name", description: "The name of the tag to use", required: false, type: CommandOptionType.STRING }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    const tag = await prisma.tag.findUnique({ where: { name: ctx.opts.name } });
    if (!tag?.userId) return sendSuggestionList(ctx);

    const tagAuthor = await ctx.member.guild.members.fetch(tag.userId.toSnowflake());

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
};

// TODO: Send a drop down list that sends the selected one
async function sendSuggestionList(ctx: Parameters<typeof Executor>[0]): Promise<void> {
    const tags = await prisma.tag.findMany({ orderBy: { uses: "desc" }, take: 10 });

    const embed = new MessageEmbed().setTitle(
        "That tag doesn't exist. Here are some of the most popular tags you can try."
    );

    for (const tag of tags) {
        embed.addField(tag.name, `Uses: ${tag.uses}`);
    }

    await ctx.send({ embeds: [embed.toJSON()], ephemeral: true });
}
