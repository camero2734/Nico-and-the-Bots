import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { roles } from "../../../Configuration/config";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Mutes a user",
    options: [
        { name: "user", description: "The user to unmute", required: true, type: ApplicationCommandOptionType.User }
    ]
});

command.setHandler(async (ctx) => {
    const { user } = ctx.opts;
    await ctx.deferReply();

    const member = await ctx.member.guild.members.fetch(user);
    await member.timeout(null);

    const embed = new EmbedBuilder().setDescription(`${member} has been unmuted!`);
    await ctx.send({ embeds: [embed] });
});

export default command;
