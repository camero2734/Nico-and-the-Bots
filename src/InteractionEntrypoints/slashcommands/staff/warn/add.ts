import { WarningType } from "@prisma/client";
import { subYears } from "date-fns";
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember } from "discord.js";
import { roles } from "../../../../Configuration/config";
import { CommandError } from "../../../../Configuration/definitions";
import { prisma, queries } from "../../../../Helpers/prisma-init";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../../Structures/TimedInteractionListener";
import JailCommand from "./../jail";

const rules = Object.values(WarningType);

const command = new SlashCommand({
    description: "Submits a warning for a user",
    options: [
        { name: "user", description: "The user to warn", required: true, type: ApplicationCommandOptionType.User },
        {
            name: "rule",
            description: "The rule broken",
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: rules.map((name) => ({ name, value: name }))
        },
        {
            name: "severity",
            description: "The severity of the warning",
            required: true,
            type: ApplicationCommandOptionType.Integer,
            choices: (<const>[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((n) => <const>{ name: `${n}`, value: n })
        },
        {
            name: "explanation",
            description:
                "A description of why you are warning the user, and how they can avoid another warning in the future.",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, rule, severity, explanation } = ctx.opts;

    await ctx.deferReply({ ephemeral: true });

    const ruleBroken = rules.find((r) => r.toLowerCase().startsWith(rule[0].toLowerCase()));

    if (!ruleBroken) throw new CommandError(`Invalid rule given. Please choose one of:\n- ${rules.join("\n- ")}`);
    if (severity < 1 || severity > 10) throw new CommandError("Invalid severity. Must be between 1 and 10.");

    const confirmationEmbed = new EmbedBuilder()
        .setTitle("Would you like to submit this warning?")
        .addFields([{ name: "User", value: `<@${user}>` }])
        .addFields([{ name: "Explanation", value: explanation }])
        .addFields([{ name: "Rule Broken", value: ruleBroken }])
        .addFields([{ name: "Severity", value: `${severity}` }]);

    const ephemeralListener = new TimedInteractionListener(ctx, <const>["warningSubmission"]);
    const [submitId] = ephemeralListener.customIDs;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        [new ButtonBuilder().setLabel("Submit Warning").setStyle(ButtonStyle.Primary).setCustomId(submitId)]
    );

    await ctx.send({ embeds: [confirmationEmbed.toJSON()], components: [actionRow] });

    const [buttonPressed] = await ephemeralListener.wait();
    if (buttonPressed !== submitId) {
        await ctx.editReply({ embeds: [new EmbedBuilder({ description: "Warning not submitted" })], components: [] });
        return;
    }

    const member = await ctx.guild.members.fetch(user);
    if (!member || !ctx.member?.roles.cache.has(roles.staff)) return;

    // Make sure warned user exists
    await queries.findOrCreateUser(member.id);

    // Save warning
    await prisma.warning.create({
        data: {
            warnedUserId: member.id,
            issuedByUserId: ctx.user.id,
            reason: explanation,
            type: ruleBroken,
            severity,
            channelId: ctx.channel.id
        }
    });

    confirmationEmbed.setTitle("Warning submitted.");
    await ctx.followUp({ embeds: [confirmationEmbed], components: [] });

    // DM warned user
    try {
        const dm = await member.createDM();
        confirmationEmbed.setTitle("You have received a warning");
        confirmationEmbed.setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() });
        confirmationEmbed.setFooter({
            text: `Please refrain from committing these infractions again. Any questions can be directed to the staff!`,
            iconURL: member.user.displayAvatarURL()
        });
        await dm.send({ embeds: [confirmationEmbed] });
    } catch (e) {
        await ctx.followUp({
            content: "> Unable to DM user about their warning, you may want to message them so they are aware",
            ephemeral: true
        });
    }

    autoJailCheck(ctx, member);
});

async function autoJailCheck(ctx: typeof command["ContextType"], member: GuildMember) {
    const oneYearAgo = subYears(new Date(), 1);
    const recentWarns = await prisma.warning.count({
        where: { warnedUserId: member.id, createdAt: { gt: oneYearAgo } }
    });

    console.log(`Recent warns: ${recentWarns}`);

    if (recentWarns < 3) {
        const embed = new EmbedBuilder();
        embed.setColor(0xff0000);
        embed.setDescription(
            `${Math.max(0, 3 - recentWarns)} more warning${recentWarns === 1 ? "" : "s"
            } until this user is auto-jailed.`
        );
        return await ctx.followUp({ embeds: [embed], ephemeral: true });
    }

    // Automatically run the jail command on the user
    JailCommand.run(ctx, {
        user: member.id,
        explanation: "[AUTO-JAIL] This user collected 3 recent warnings and has been automatically jailed"
    });
}

export default command;
