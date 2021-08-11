import { cairoVersion } from "canvas";
import { CommandError } from "../../configuration/definitions";
import { Message, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { prisma } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";

const command = new SlashCommand(<const>{
    description: "Creates (or edits) a command that sends a short snippet of text",
    options: [
        { name: "name", description: "The name of the tag", required: true, type: "STRING" },
        {
            name: "text",
            description: "The text that gets sent with the tag",
            required: true,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const existingTag = await prisma.tag.findUnique({ where: { name: ctx.opts.name } });

    if (existingTag?.userId) {
        if (existingTag.userId.toSnowflake() !== ctx.user.id) throw new CommandError("This tag already exists");
        existingTag.text = ctx.opts.text;

        await prisma.tag.update({
            where: { name: existingTag.name },
            data: { text: ctx.opts.text }
        });

        const embed = new MessageEmbed()
            .setTitle(`Your tag \`${ctx.opts.name}\` was successfully edited`)
            .setDescription(ctx.opts.text);
        await ctx.send({ embeds: [embed.toJSON()] });
        return;
    }

    const textLookup = await prisma.temporaryText.create({
        data: { value: ctx.opts.text }
    });

    const embed = new MessageEmbed()
        .setTitle(`Create tag \`${ctx.opts.name}\`?`)
        .setDescription(ctx.opts.text)
        .setFooter("Select yes or no");

    const actionRow = new MessageActionRow().addComponents(
        new MessageButton({
            label: "Yes",
            style: "SUCCESS",
            customId: generateYesID({ name: ctx.opts.name, textLookup: `${textLookup.id}` })
        })
    );

    await ctx.send({ embeds: [embed], components: [actionRow] });
});

const generateYesID = command.addInteractionListener("tcYes", <const>["name", "textLookup"], async (ctx, args) => {
    await ctx.deferReply({ ephemeral: true });

    const { value: text, id } = (await prisma.temporaryText.findUnique({ where: { id: +args.textLookup } })) || {};
    if (!text) return;

    const [createdTag] = await prisma.$transaction([
        prisma.tag.create({
            data: { text, userId: ctx.user.id, name: args.name }
        }),
        prisma.temporaryText.delete({ where: { id } })
    ]);

    const doneEmbed = new MessageEmbed()
        .setTitle(`Tag created: \`${args.name}\``)
        .setDescription(text)
        .addField("Usage", `Use this tag with the command \`/tags use ${createdTag.name}\``);

    await ctx.editReply({ embeds: [doneEmbed], components: [] });
});

export default command;
