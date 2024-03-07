import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getTagNameSearcher } from "./_consts";

const command = new SlashCommand({
    description: "Delete a tag",
    options: [
        {
            name: "tag",
            description: "The name of the tag to delete",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const tag = await prisma.tag.findUnique({ where: { name: ctx.opts.tag } });
    if (!tag) throw new CommandError("This tag does not exist");

    if (tag.userId !== ctx.member.id && !ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("You cannot delete this command as you do not own it.");
    }

    await prisma.tag.delete({ where: { name: ctx.opts.tag } });

    const embed = new EmbedBuilder().setTitle(`Tag ${tag.name} deleted`).setDescription(tag.text);

    try {
        const member = await ctx.guild.members.fetch(tag.userId);
        embed.setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() });
    } catch {
        //
    }

    await ctx.editReply({ embeds: [embed] });
});

command.addAutocompleteListener("tag", async (ctx) => {
    const searcher = await getTagNameSearcher();

    const searchedTags = searcher.search(ctx.opts.tag, { limit: 10 });

    const options = searchedTags.map((tag) => ({
        name: tag.item,
        value: tag.item
    }));

    await ctx.respond(options);
});

export default command;
