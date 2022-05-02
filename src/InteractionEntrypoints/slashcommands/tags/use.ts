import { CommandError } from "../../../Configuration/definitions";
import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import moize from "moize";
import { minutesToMilliseconds } from "date-fns";
import Fuse from "fuse.js";
import { getTagNameSearcher } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Uses or searches for a tag",
    options: [
        {
            name: "name",
            description: "The name of the tag to use",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        },
        {
            name: "info",
            description: "Shows extra info about the tag",
            required: false,
            type: ApplicationCommandOptionType.Boolean
        }
    ]
});

const canSend = (ctx: typeof command.ContextType): boolean => {
    const rolesCache = ctx.member.roles.cache;
    if (rolesCache.has(roles.deatheaters) || rolesCache.has(roles.staff)) return true;
    if (ctx.channel.id === channelIDs.commands) return true;
    return false;
};

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: !canSend(ctx) });

    const tag = await prisma.tag.findUnique({ where: { name: ctx.opts.name } });
    if (!tag?.userId) return sendSuggestionList(ctx);

    const tagAuthor =
        (await ctx.guild?.members.fetch(tag.userId.toSnowflake()).catch(() => null)) ||
        (await ctx.guild.members.fetch(ctx.client.user?.id || ""));
    if (!tagAuthor) throw new CommandError("The user that created this tag no longer exists");

    // Increase # of uses
    await prisma.tag.update({
        where: { name: tag.name },
        data: { uses: { increment: 1 } }
    });

    if (ctx.opts.info) {
        const embed = new EmbedBuilder()
            .setTitle(tag.name)
            .setDescription(tag.text)
            .setColor(tagAuthor.displayColor)
            .setFooter({ text: `Created by ${tagAuthor.displayName}`, iconURL: tagAuthor.user.displayAvatarURL() });

        await ctx.editReply({ embeds: [embed] });
    } else {
        await ctx.editReply({ content: tag.text, allowedMentions: { parse: [] } });
    }
});

// TODO: Send a drop down list that sends the selected one
async function sendSuggestionList(ctx: typeof command.ContextType): Promise<void> {
    const tags = await prisma.tag.findMany({ orderBy: { uses: "desc" }, take: 5 });

    const embed = new EmbedBuilder().setTitle("That tag doesn't exist. Here are some of the most popular tags you can try.");

    for (const tag of tags) {
        embed.addFields({ name: tag.name, value: `Uses: ${tag.uses}` });
    }

    await ctx.editReply({ embeds: [embed] });
}

command.addAutocompleteListener("name", async (ctx) => {
    const searcher = await getTagNameSearcher();

    const searchedTags = searcher.search(ctx.opts.name, { limit: 10 });

    const options = searchedTags.map((tag) => ({
        name: tag.item,
        value: tag.item
    }));

    await ctx.respond(options);
});

export default command;
