import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { roles } from "../../../../Configuration/config";
import { CommandError } from "../../../../Configuration/definitions";
import F from "../../../../Helpers/funcs";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Starts a lockdown in the channel",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    // Ensure the channel hasn't already been locked down
    const channelPermissionsBackup = await prisma.channelPermissionsBackup.findFirst({
        where: { channelId: ctx.channel.id }
    });

    if (channelPermissionsBackup) {
        const timestamp = F.discordTimestamp(channelPermissionsBackup.createdAt, "relative");
        throw new CommandError(`A lockdown was already started ${timestamp}`);
    }

    // Backup channel permissions to database
    const permissions = [...ctx.channel.permissionOverwrites.cache.values()].map((r) => JSON.parse(JSON.stringify(r)));
    await prisma.channelPermissionsBackup.create({
        data: { channelId: ctx.channel.id, permissions }
    });

    // Disable talking permissions for non-staff
    await ctx.channel.permissionOverwrites.edit(ctx.guild.id, { SendMessages: false });
    await ctx.channel.permissionOverwrites.edit(roles.banditos, { SendMessages: false });
    await ctx.channel.permissionOverwrites.edit(roles.staff, { SendMessages: true });

    await ctx.send({ content: "`Lockdown successful`" });

    const lockEmbed = new EmbedBuilder()
        .setTitle("Lockdown started")
        .setDescription(
            "A lockdown has been started by a staff member. Until they unlock the channel, non-staff will not be allowed to talk in the channel."
        )
        .addFields({
            name: "For staff members",
            value: "You may unlock this channel with the `/staff lockdown end` slash command."
        });

    await ctx.followUp({ embeds: [lockEmbed] });
});

export default command;
