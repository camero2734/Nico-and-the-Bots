import { EmbedBuilder } from "discord.js";
import { roles } from "../../../Configuration/config";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Shows the number of users in each district",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const districts = F.entries(roles.districts);

    const embed = new EmbedBuilder()
        .setTitle("District Apporitionment")
        .setColor("Blurple");

    for (const [name, id] of districts) {
        const role = await ctx.guild.roles.fetch(id);
        if (!role) continue;

        const population = role.members.size;
        embed.addFields([
            {
                name: name,
                value: population.toString(),
                inline: true
            }
        ])
    }

    await ctx.editReply({ embeds: [embed] });
});

export default command;
