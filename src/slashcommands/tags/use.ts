import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType } from "slash-create";
import { Tag } from "../../database/entities/Tag";

export const Options = createOptions(<const>{
    description: "Uses or searches for a tag",
    options: [
        { name: "name", description: "The name of the tag to use", required: false, type: CommandOptionType.STRING }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    const tagRepo = ctx.connection.getRepository(Tag);

    const tag = ctx.opts.name ? await tagRepo.findOne({ identifier: ctx.opts.name }) : undefined;
    if (!tag) return sendSuggestionList(ctx);

    const tagAuthor = await ctx.member.guild.members.fetch(tag.userid as Snowflake);

    const embed = new MessageEmbed()
        .setTitle(tag.identifier)
        .setDescription(tag.text)
        .setColor(tagAuthor.displayColor)
        .setFooter(`Created by ${tagAuthor.displayName}`, tagAuthor.user.displayAvatarURL());

    // Increase # of uses
    tag.uses++;
    await ctx.connection.manager.save(tag);

    await ctx.send({ embeds: [embed.toJSON()] });
};

// TODO: Send a drop down list that sends the selected one
async function sendSuggestionList(ctx: Parameters<typeof Executor>[0]): Promise<void> {
    const tagRepo = ctx.connection.getMongoRepository(Tag);
    const tags = await tagRepo.find({ order: { uses: "DESC" }, take: 10 });

    const embed = new MessageEmbed().setTitle(
        "That tag doesn't exist. Here are some of the most popular tags you can try."
    );

    for (const tag of tags) {
        embed.addField(tag.identifier, `Uses: ${tag.uses}`);
    }

    await ctx.send({ embeds: [embed.toJSON()], ephemeral: true });
}
