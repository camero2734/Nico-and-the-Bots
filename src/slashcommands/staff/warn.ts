import { WarningType } from "@prisma/client";
import { CommandError } from "configuration/definitions";
import { subYears } from "date-fns";
import { GuildMember, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { roles } from "../../configuration/config";
import { TimedInteractionListener } from "../../helpers/timed-interaction-listener";
import { prisma, queries } from "../../helpers/prisma-init";
import { ExtendedInteraction, SlashCommand } from "../../helpers/slash-command";

const rules = Object.values(WarningType);

const command = new SlashCommand(<const>{
    description: "Submits a warning for a user",
    options: [
        { name: "user", description: "The user to warn", required: true, type: "USER" },
        {
            name: "rule",
            description: "The rule broken. Must be one of {B, D, S, N, O} (you can write it out too)",
            required: true,
            type: "STRING",
            choices: rules.map((name) => ({ name, value: name }))
        },
        {
            name: "severity",
            description: "The severity of the warning. Must be between 1 and 10 (inclusive)",
            required: true,
            type: "INTEGER"
        },
        {
            name: "explanation",
            description:
                "A description of why you are warning the user, and how they can avoid another warning in the future.",
            required: true,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, rule, severity, explanation } = ctx.opts;

    await ctx.defer({ ephemeral: true });

    const ruleBroken = rules.find((r) => r.toLowerCase().startsWith(rule[0].toLowerCase()));

    if (!ruleBroken) throw new CommandError(`Invalid rule given. Please choose one of:\n- ${rules.join("\n- ")}`);
    if (severity < 1 || severity > 10) throw new CommandError("Invalid severity. Must be between 1 and 10.");

    const confirmationEmbed = new MessageEmbed()
        .setTitle("Would you like to submit this warning?")
        .addField("User", `<@${user}>`)
        .addField(FIELDS.Explanation, explanation)
        .addField(FIELDS.RuleBroken, ruleBroken)
        .addField(FIELDS.Severity, `${severity}`);

    const ephemeralListener = new TimedInteractionListener(ctx, <const>["warningSubmission"]);
    const [submitId] = ephemeralListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            label: "Submit Warning",
            style: "PRIMARY",
            customId: submitId
        })
    ]);

    await ctx.send({ embeds: [confirmationEmbed.toJSON()], components: [actionRow] });

    const buttonPressed = await ephemeralListener.wait();
    if (buttonPressed !== submitId) {
        await ctx.editReply({ embeds: [new MessageEmbed({ description: "Warning not submitted" })] });
        return;
    }

    const member = ctx.member as GuildMember | undefined;
    if (!member?.roles.cache.has(roles.staff)) return;

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
    await ctx.editReply({ embeds: [confirmationEmbed], components: [] });

    // DM warned user
    try {
        const dm = await member.createDM();
        confirmationEmbed.setTitle("You have received a warning");
        confirmationEmbed.setAuthor(member.displayName, member.user.displayAvatarURL());
        confirmationEmbed.setFooter(
            `Initiated by ${member.displayName} || Please refrain from committing these infractions again. Any questions can be directed to the staff!`,
            member.user.displayAvatarURL()
        );
        await dm.send({ embeds: [confirmationEmbed] });
    } catch (e) {
        await ctx.followUp({
            content: "> Unable to DM user about their warning, you may want to message them so they are aware",
            ephemeral: true
        });
    }

    autoJailCheck(ctx, member);
});

const FIELDS = <const>{
    Explanation: "Explanation",
    RuleBroken: "Rule Broken",
    Severity: "Severity"
};

async function autoJailCheck(ctx: ExtendedInteraction, member: GuildMember) {
    const oneYearAgo = subYears(new Date(), 1);
    const recentWarns = await prisma.warning.count({
        where: { warnedUserId: member.id, createdAt: { gt: oneYearAgo } }
    });

    console.log(`Recent warns: ${recentWarns}`);

    if (recentWarns < 3) {
        const embed = new MessageEmbed();
        embed.setColor("#FF0000");
        embed.setDescription(
            `${Math.max(0, 3 - recentWarns)} more warning${
                recentWarns === 1 ? "" : "s"
            } until this user is auto-jailed.`
        );
        return await ctx.followUp({ embeds: [embed], ephemeral: true });
    }
    // TODO: Fix
    // const data: InteractionRequestData = {
    //     channel_id: interaction.channelID as string,
    //     data: {id: "f", name: "fff"},
    //     guild_id: interaction.guildID as string,
    //     id: "f",
    //     member: interaction.member as CommandMember,
    //     token: "f",
    //     version: 1,
    //     type: InteractionType.COMMAND
    // }
    // const ctx = new CommandContext(interactions, data, async () => { /** */ }, false);
    // const ectx = await extendContext(ctx, interaction.client, null as any);
    // // Hooks into !jail to jail user
    // ectx.runCommand(jail.Executor, {
    //     user: member.user.id,
    //     explanation: "[Autojail] You were automatically jailed for receiving multiple warnings."
    // });
}
