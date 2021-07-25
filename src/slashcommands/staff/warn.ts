import { WarningType } from "@prisma/client";
import { CommandComponentListener, CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { subYears } from "date-fns";
import { ButtonInteraction, GuildMember, MessageActionRow, MessageButton, MessageEmbed, Snowflake } from "discord.js";
import { CommandOptionType, ComponentActionRow } from "slash-create";
import { roles } from "../../configuration/config";
import { prisma, queries } from "../../helpers/prisma-init";

const rules = Object.values(WarningType);

export const Options: CommandOptions = {
    description: "Submits a warning for a user",
    options: [
        { name: "user", description: "The user to warn", required: true, type: CommandOptionType.USER },
        {
            name: "rule",
            description: "The rule broken. Must be one of {B, D, S, N, O} (you can write it out too)",
            required: true,
            type: CommandOptionType.STRING,
            choices: rules.map((name) => ({ name, value: name }))
        },
        {
            name: "severity",
            description: "The severity of the warning. Must be between 1 and 10 (inclusive)",
            required: true,
            type: CommandOptionType.INTEGER
        },
        {
            name: "explanation",
            description:
                "A description of why you are warning the user, and how they can avoid another warning in the future.",
            required: true,
            type: CommandOptionType.STRING
        }
    ]
};

const answerListener = new CommandComponentListener("submitWarning", <const>["userId"]);
export const ComponentListeners: CommandComponentListener[] = [answerListener];

const FIELDS = <const>{
    Explanation: "Explanation",
    RuleBroken: "Rule Broken",
    Severity: "Severity"
};

export const Executor: CommandRunner<{
    user: Snowflake;
    rule: typeof rules[number];
    severity: number;
    explanation: string;
}> = async (ctx) => {
    const { user, rule, severity, explanation } = ctx.opts;

    await ctx.defer(true);

    const ruleBroken = rules.find((r) => r.toLowerCase().startsWith(rule[0].toLowerCase()));

    if (!ruleBroken) throw new CommandError(`Invalid rule given. Please choose one of:\n- ${rules.join("\n- ")}`);
    if (severity < 1 || severity > 10) throw new CommandError("Invalid severity. Must be between 1 and 10.");

    const confirmationEmbed = new MessageEmbed()
        .setTitle("Would you like to submit this warning?")
        .addField("User", `<@${user}>`)
        .addField(FIELDS.Explanation, explanation)
        .addField(FIELDS.RuleBroken, ruleBroken)
        .addField(FIELDS.Severity, `${severity}`);

    const actionRow = new MessageActionRow()
        .addComponents([
            new MessageButton({
                label: "Submit Warning",
                style: "PRIMARY",
                customID: answerListener.generateCustomID({ userId: user })
            })
        ])
        .toJSON();

    await ctx.send({ embeds: [confirmationEmbed.toJSON()], components: [actionRow as ComponentActionRow] });
};

async function autoJailCheck(interaction: ButtonInteraction, member: GuildMember) {
    const oneYearAgo = subYears(new Date(), 1);
    const recentWarns = await prisma.warning.count({
        where: { warnedUserId: member.id, createdAt: { gt: oneYearAgo } }
    });

    if (recentWarns < 3) {
        const embed = new MessageEmbed();
        embed.setColor("#FF0000");
        embed.setDescription(
            `${Math.max(0, 3 - recentWarns)} more warning${
                recentWarns === 1 ? "" : "s"
            } until this user is auto-jailed.`
        );
        return await interaction.followUp({ embeds: [embed], ephemeral: true });
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

answerListener.handler = async (interaction, connection, args) => {
    if (!interaction.isButton() || !interaction.channel) return;
    interaction.deferred = true;

    const member = interaction.member as GuildMember | undefined;
    if (!member?.roles.cache.has(roles.staff)) return;

    const embed = interaction.message.embeds[0] as MessageEmbed;

    // Parse information from original embed
    const reason = embed.fields.find((f) => f.name === FIELDS.Explanation)?.value;
    const ruleBroken = embed.fields.find((f) => f.name === FIELDS.RuleBroken)?.value as typeof rules[number];
    const severityStr = embed.fields.find((f) => f.name === FIELDS.Severity)?.value;
    if (!reason || !ruleBroken || !severityStr) return;
    const severity = +severityStr;
    if (isNaN(severity)) return;

    // Make sure warned user exists
    const dbUser = await queries.findOrCreateUser(args.userId);

    // Save warning
    const warning = await prisma.warning.create({
        data: {
            warnedUserId: member.id,
            issuedByUserId: interaction.user.id,
            reason: reason,
            type: ruleBroken,
            severity,
            channelId: interaction.channel.id
        }
    });

    embed.setTitle("Warning submitted.");
    await interaction.editReply({ embeds: [embed], components: [] });

    // DM warned user
    try {
        const dm = await member.createDM();
        embed.setTitle("You have received a warning");
        embed.setAuthor(member.displayName, member.user.displayAvatarURL());
        embed.setFooter(
            `Initiated by ${member.displayName} || Please refrain from committing these infractions again. Any questions can be directed to the staff!`,
            member.user.displayAvatarURL()
        );
        await dm.send({ embeds: [embed] });
    } catch (e) {
        await interaction.followUp({
            content: "> Unable to DM user about their warning, you may want to message them so they are aware",
            ephemeral: true
        });
    }

    autoJailCheck(interaction, member);
};
