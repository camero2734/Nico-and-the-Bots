import { Embed } from "discord.js/packages/discord.js";
import { roles } from "../../../Configuration/config";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Mutes a user",
    options: [{ name: "user", description: "The user to unmute", required: true, type: "USER" }]
});

command.setHandler(async (ctx) => {
    const { user } = ctx.opts;
    await ctx.deferReply();

    const member = await ctx.member.guild.members.fetch(user);
    await member.roles.remove(roles.muted);
    await member.roles.add(roles.banditos);

    // Mark any current mutes as finished
    await prisma.mute.updateMany({
        where: { mutedUserId: member.id },
        data: { finished: true }
    });

    const embed = new Embed().setDescription(`${member} has been unmuted!`);
    await ctx.send({ embeds: [embed] });
});

export default command;
