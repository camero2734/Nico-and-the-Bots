import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { Tag } from "../../database/entities/Tag";
import { MessageTools } from "../../helpers";

export const Options = createOptions(<const>{
    description: "Creates (or edits) a command that sends a short snippet of text",
    options: [
        { name: "name", description: "The name of the tag", required: true, type: CommandOptionType.STRING },
        {
            name: "text",
            description: "The text that gets sent with the tag",
            required: true,
            type: CommandOptionType.STRING
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer(true);

    const tagRepo = ctx.connection.getRepository(Tag);

    const existingTag = await tagRepo.findOne({ identifier: ctx.opts.name });
    if (existingTag) {
        if (existingTag.userid !== ctx.member.id) throw new CommandError("This tag already exists");
        existingTag.text = ctx.opts.text;
        await ctx.connection.manager.save(existingTag);
        const embed = new MessageEmbed()
            .setTitle(`Your tag \`${ctx.opts.name}\` was successfully edited`)
            .setDescription(ctx.opts.text);
        return ctx.send({ embeds: [embed.toJSON()] });
    }

    const embed = new MessageEmbed()
        .setTitle(`Create tag \`${ctx.opts.name}\`?`)
        .setDescription(ctx.opts.text)
        .setFooter("Select yes or no");

    const agreed = await MessageTools.askYesOrNo(ctx, { embeds: [embed.toJSON()] });
    if (!agreed) {
        return ctx.editOriginal({
            embeds: [new MessageEmbed().setDescription("Okay, your tag wasn't made.").toJSON()],
            components: []
        });
    }

    const tag = new Tag({ text: ctx.opts.text, userid: ctx.member.id, identifier: ctx.opts.name });
    await ctx.connection.manager.save(tag);

    const doneEmbed = new MessageEmbed()
        .setTitle(`Tag created: \`${ctx.opts.name}\``)
        .setDescription(ctx.opts.text)
        .addField("Usage", `Use this tag with the command \`/tags use ${tag.identifier}\``);

    await ctx.editOriginal({ embeds: [doneEmbed.toJSON()], components: [] });
};
