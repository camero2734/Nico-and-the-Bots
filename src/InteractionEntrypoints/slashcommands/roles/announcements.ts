import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { roles } from "../../../Configuration/config";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Enables or disables the announcements role",
    options: []
});

command.setHandler(async (ctx) => {
    const hasAnnouncements = ctx.member.roles.cache.has(roles.announcements);
    const action = hasAnnouncements ? "Removed" : "Added";

    const embed = new EmbedBuilder().setDescription(`${action} the <@&${roles.announcements}> role`);

    if (hasAnnouncements) ctx.member.roles.remove(roles.announcements);
    else ctx.member.roles.add(roles.announcements);

    await ctx.send({ embeds: [embed] });
});

export default command;
