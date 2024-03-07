import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "View tags created by someone",
    options: [
        {
            name: "user",
            description: "The user to view tags from",
            required: false,
            type: ApplicationCommandOptionType.User
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    const userId = ctx.opts.user || ctx.user.id;
    const member = await ctx.guild.members.fetch(userId);

    const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { uses: "desc" } });

    if (!tags || tags.length === 0) throw new CommandError("This person does not have any tags");

    const embed = new EmbedBuilder() //
        .setAuthor({ name: `${member.displayName}'s tags`, iconURL: member.user.displayAvatarURL() });

    for (const tag of tags) {
        embed.addFields([{ name: `${tag.name} [${tag.uses}]`, value: tag.text }]);
    }

    await ctx.editReply({ embeds: [embed] });
});

export default command;
