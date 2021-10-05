import { APIOverwrite } from "discord-api-types";
import { MessageEmbed, OverwriteData, OverwriteResolvable, PermissionOverwrites } from "discord.js";
import { CommandError } from "../../../../Configuration/definitions";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Ends the lockdown in the channel",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });
    const channelPermissionsBackup = await prisma.channelPermissionsBackup.findFirst({
        where: { channelId: ctx.channel.id }
    });

    if (!channelPermissionsBackup) {
        throw new CommandError(`This channel isn't locked down`);
    }

    // Parse permissions data
    const rawPermissions = (<unknown>channelPermissionsBackup.permissions) as OverwriteResolvable[];
    // const permissions = rawPermissions.map((p) => PermissionOverwrites.resolve(<unknown>p as OverwriteData, ctx.guild));

    await ctx.channel.permissionOverwrites.set(rawPermissions, `Lockdown end by ${ctx.user.id}`);

    await prisma.channelPermissionsBackup.delete({ where: { channelId: ctx.channel.id } });

    // Disable talking permissions for non-staff
    await ctx.send({ content: "`Lockdown successfully ended`" });

    const lockEndEmbed = new MessageEmbed()
        .setTitle("Lockdown ended")
        .setDescription("The lockdown in this channel has ended. Normal channel permissions have been restored.");

    await ctx.followUp({ embeds: [lockEndEmbed] });
});

export default command;
