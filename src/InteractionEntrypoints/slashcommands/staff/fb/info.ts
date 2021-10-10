import { MessageEmbed } from "discord.js";
import { roles } from "../../../../Configuration/config";
import F from "../../../../Helpers/funcs";
import { prisma } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Shows the # of FB apps in various states",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply();

    const unsubmitted = await prisma.firebreatherApplication.count({ where: { submittedAt: null } });
    const awaiting = await prisma.firebreatherApplication.count({
        where: { submittedAt: { not: null }, decidedAt: null }
    });

    const approved = await prisma.firebreatherApplication.count({
        where: { decidedAt: { not: null }, approved: true }
    });
    const denied = await prisma.firebreatherApplication.count({ where: { decidedAt: { not: null }, approved: false } });

    const fbRole = await ctx.guild.roles.fetch(roles.deatheaters);

    const embed = new MessageEmbed()
        .setAuthor("Firebreather Application Stats", fbRole?.iconURL() || undefined)
        .addField("Awaiting submission", `${unsubmitted} application${F.plural(unsubmitted)}`)
        .addField("Needs decision", `${awaiting} application${F.plural(awaiting)}`)
        .addField("Approved", `${approved} application${F.plural(approved)}`)
        .addField("Denied", `${denied} application${F.plural(denied)}`);

    await ctx.editReply({ embeds: [embed] });
});

export default command;
