/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays } from "date-fns";
import {
    ActionRowBuilder,
    Colors,
    EmbedBuilder,
    Guild,
    Attachment,
    SelectMenuComponent,
    SelectMenuOption,
    TextChannel
} from "discord.js";
import { channelIDs, emojiIDs, roles } from "../../Configuration/config";
import { CommandError } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { rollbar } from "../../Helpers/logging/rollbar";
import { prisma } from "../../Helpers/prisma-init";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";
import { generateScoreCard } from "../slashcommands/econ/score";

export const FB_DELAY_DAYS = 14;
enum ActionTypes {
    Accept,
    Deny
}

const msgInt = new MessageInteraction();

export const GenBtnId = msgInt.addInteractionListener(
    "staffFBAppRes",
    <const>["type", "applicationId"],
    async (ctx, args) => {
        await ctx.update({ components: [] });

        const applicationId = args.applicationId;
        const application = await prisma.firebreatherApplication.findUnique({ where: { applicationId } });
        if (!application) throw new CommandError("This application no longer exists");

        const member = await ctx.guild.members.fetch(application.userId);
        if (!member) throw new CommandError("This member appears to have left the server");

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Firebreathers Application results", iconURL: member.client.user?.displayAvatarURL() })
            .setFooter({ text: applicationId });

        if (!embed.author) return; // Just to make typescript happy

        const msgEmbed = ctx.message.embeds[0];

        const action = ctx.isSelectMenu() ? +ctx.values[0] : +args.type;
        if (action === ActionTypes.Accept) {
            await prisma.firebreatherApplication.update({
                where: { applicationId },
                data: { approved: true, decidedAt: new Date() }
            });
            await member.roles.add(roles.deatheaters);

            embed.author.name = "Firebreathers Application Approved";
            embed.setDescription(`You are officially a Firebreather! You may now access <#${channelIDs.fairlylocals}>`);

            await ctx.editReply({ embeds: [msgEmbed.setColor(Colors.Green)] });
        } else if (action === ActionTypes.Deny) {
            await prisma.firebreatherApplication.update({
                where: { applicationId },
                data: { approved: false, decidedAt: new Date() }
            });

            const timestamp = F.discordTimestamp(
                addDays(application.submittedAt || new Date(), FB_DELAY_DAYS),
                "relative"
            );

            embed.author.name = "Firebreathers Application Denied";
            embed.setDescription(`Unfortunately, your application for FB was denied. You may reapply ${timestamp}`);
            await ctx.editReply({ embeds: [msgEmbed.setColor(Colors.Red)] });
        } else throw new Error("Invalid action type");

        const doneByEmbed = new EmbedBuilder()
            .setAuthor({ name: ctx.member.displayName, iconURL: ctx.member.displayAvatarURL() })
            .setDescription(
                `${ctx.member} ${action === ActionTypes.Accept ? "accepted" : "denied"} ${member}'s FB application`
            )
            .setFooter({ text: applicationId });

        // Archive thread
        const thread = ctx.message.thread;
        if (thread) {
            await thread.setArchived(true, "Decision was made, thread no longer necessary");

            doneByEmbed.addFields({ name: "Thread", value: `${thread}` });
        }

        await ctx.followUp({ embeds: [doneByEmbed] });

        await F.sendMessageToUser(member, { embeds: [embed] });
    }
);

export async function sendToStaff(
    guild: Guild,
    applicationId: string,
    data: Record<string, string>
): Promise<string | undefined> {
    try {
        const fbApplicationChannel = (await guild.channels.fetch(channelIDs.deapplications)) as TextChannel;

        const application = await prisma.firebreatherApplication.findUnique({ where: { applicationId } });
        if (!application) throw new Error("No application found");

        const member = await guild.members.fetch(application.userId);
        if (!member) throw new Error("No member found");

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${member.displayName}'s application`, iconURL: member.displayAvatarURL() })
            .setFooter({ text: applicationId });

        for (const [name, value] of Object.entries(data)) {
            embed.addFields({ name: name, value: value?.substring(0, 1000) || "*Nothing*" });
        }

        const actionRow = new ActionRowBuilder().setComponents(
            new SelectMenuComponent()
                .addOptions(
                    ...[
                        new SelectMenuOption({
                            label: "Accept",
                            value: ActionTypes.Accept.toString(),
                            emoji: { id: emojiIDs.upvote }
                        }),
                        new SelectMenuOption({
                            label: "Deny",
                            value: ActionTypes.Deny.toString(),
                            emoji: { id: emojiIDs.downvote }
                        })
                    ]
                )
                .setCustomId(GenBtnId({ applicationId, type: "" }))
        );

        const scoreCard = await generateScoreCard(member);
        const attachment = new Attachment(scoreCard, "score.png");

        const m = await fbApplicationChannel.send({
            embeds: [embed],
            components: [actionRow]
        });

        try {
            const thread = await m.startThread({
                name: `${member.displayName} application discussion (${applicationId})`,
                autoArchiveDuration: "MAX"
            });

            await thread.send({ content: `${member}`, files: [attachment] });

            const userWarnings = await prisma.warning.findMany({
                where: { warnedUserId: member.id },
                take: 5,
                orderBy: { createdAt: "desc" }
            });
            const totalWarnings = await prisma.warning.count({ where: { warnedUserId: member.id } });

            const warningsEmbed = new EmbedBuilder()
                .setTitle(`${member.displayName}'s most recent warnings`)
                .setFooter({ text: `${totalWarnings} total warning(s)` });
            if (userWarnings.length > 0) {
                for (const warn of userWarnings) {
                    // prettier-ignore
                    warningsEmbed.addFields({ name: `${warn.reason.substring(0, 200)} [${warn.severity}]`, value: F.discordTimestamp(warn.createdAt, "relative") })
                }
            } else {
                warningsEmbed.setDescription("*This user has no warnings*");
            }

            await thread.send({ embeds: [warningsEmbed] });

            // Send message to member
            await F.sendMessageToUser(member, {
                embeds: [
                    new EmbedBuilder({
                        description: `Your FB application (${applicationId}) has been received by the staff. Please allow a few days for it to be reviewed.`
                    })
                ]
            });

            await m.react(emojiIDs.upvote);
            await m.react(emojiIDs.downvote);
        } catch (e) {
            // Undo the message
            await m.delete();
            return;
        }

        return m.url;
    } catch (e) {
        if (e instanceof Error) rollbar.log(e);
        else rollbar.log(`${e}`);
    }
}

export default msgInt;
