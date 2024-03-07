import { subHours } from "date-fns";
import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import F from "../../../Helpers/funcs";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Deletes a certain number of messages",
    options: [
        {
            name: "hours",
            description: "The number of previous hours to look over",
            required: false,
            type: ApplicationCommandOptionType.Integer
        }
    ]
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const hours = ctx.opts.hours || 24;
    const after = subHours(new Date(), hours);

    const count = await prisma.user.count({ where: { joinedAt: { gte: after } } });

    const embed = new EmbedBuilder()
        .setTitle(`In the last ${hours} hours...`)
        .setDescription(`**${count}** user${F.plural(count)} joined`);

    await ctx.send({ embeds: [embed.toJSON()] });
});

export default command;
