import { addDays } from "date-fns";
import {
    Guild,
    ActionRowComponent,
    MessageAttachment,
    ButtonComponent,
    Embed,
    MessageOptions,
    MessageSelectMenu,
    TextChannel
} from "discord.js/packages/discord.js";
import { channelIDs, emojiIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { rollbar } from "../../../Helpers/logging/rollbar";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { generateScoreCard } from "../econ/score";
import { FB_DELAY_DAYS, genApplicationLink, getActiveFirebreathersApplication } from "./_consts";

enum ActionTypes {
    Accept,
    Deny
}

const command = new SlashCommand(<const>{
    description: "Opens an application to the Firebreathers role",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.member.roles.cache.has(roles.deatheaters)) {
        throw new CommandError("You are already a firebreather!");
    }

    // Ensure they haven't already started an application
    const activeApplication = await getActiveFirebreathersApplication(ctx.user.id);

    if (activeApplication) {
        const { applicationId } = activeApplication;
        if (activeApplication.decidedAt) {
            const timestamp = F.discordTimestamp(
                addDays(activeApplication.submittedAt || new Date(), FB_DELAY_DAYS),
                "relative"
            );
            throw new CommandError(`You have already recently applied! You can apply again ${timestamp}`);
        } else if (!activeApplication.submittedAt) {
            const link = genApplicationLink(applicationId);
            throw new CommandError(
                `You have not submitted your previous application (${applicationId}). To do so, visit [this link](${link}).\n\nIf you believe this is a mistake, please contact the staff.`
            );
        } else {
            const timestamp = F.discordTimestamp(activeApplication.submittedAt || new Date(), "relative");
            throw new CommandError(
                `Your previous application (${applicationId}) has not been reviewed by staff yet.\n\nIt was submitted ${timestamp}.`
            );
        }
    }

    // Start a new application
    const { applicationId } = await prisma.firebreatherApplication.create({
        data: { userId: ctx.user.id }
    });

    const link = genApplicationLink(applicationId);

    const embed = new Embed()
        .setAuthor(ctx.member.displayName, ctx.member.displayAvatarURL())
        .setDescription(
            "Click the button below to open the application. It should be pre-filled with your **Application ID**, which is a one-time code. This code is only valid for you, and only once."
        )
        .addField("Application ID", applicationId);

    const actionRow = new ActionRow().setComponents([
        new ButtonComponent({ style: "LINK", url: link, label: "Open Application" })
    ]);

    await ctx.editReply({ embeds: [embed], components: [actionRow] });
});

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

        const embed = new Embed()
            .setAuthor(`${member.displayName}'s application`, member.displayAvatarURL())
            .setFooter(applicationId);

        for (const [name, value] of Object.entries(data)) {
            embed.addField(name, value?.substring(0, 1000) || "*Nothing*");
        }

        const actionRow = new ActionRow().setComponents([
            new MessageSelectMenu()
                .addOptions([
                    { label: "Accept", value: ActionTypes.Accept.toString(), emoji: emojiIDs.upvote },
                    { label: "Deny", value: ActionTypes.Deny.toString(), emoji: emojiIDs.downvote }
                ])
                .setCustomId(genId({ applicationId, type: "" }))
        ]);

        const scoreCard = await generateScoreCard(member);
        const attachment = new MessageAttachment(scoreCard, "score.png");

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

            const warningsEmbed = new Embed()
                .setTitle(`${member.displayName}'s most recent warnings`)
                .setFooter(`${totalWarnings} total warning(s)`);
            if (userWarnings.length > 0) {
                for (const warn of userWarnings) {
                    // prettier-ignore
                    warningsEmbed.addField(`${warn.reason.substring(0, 200)} [${warn.severity}]`, F.discordTimestamp(warn.createdAt, "relative"))
                }
            } else {
                warningsEmbed.setDescription("*This user has no warnings*");
            }

            await thread.send({ embeds: [warningsEmbed] });

            // Send message to member
            await F.sendMessageToUser(member, {
                embeds: [
                    new Embed({
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

const genId = command.addInteractionListener("staffFBAppRes", <const>["type", "applicationId"], async (ctx, args) => {
    await ctx.update({ components: [] });

    const applicationId = args.applicationId;
    const application = await prisma.firebreatherApplication.findUnique({ where: { applicationId } });
    if (!application) throw new CommandError("This application no longer exists");

    const member = await ctx.guild.members.fetch(application.userId);
    if (!member) throw new CommandError("This member appears to have left the server");

    const embed = new Embed()
        .setAuthor("Firebreathers Application results", member.client.user?.displayAvatarURL())
        .setFooter(applicationId);

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

        await ctx.editReply({ embeds: [msgEmbed.setColor("GREEN")] });
    } else if (action === ActionTypes.Deny) {
        await prisma.firebreatherApplication.update({
            where: { applicationId },
            data: { approved: false, decidedAt: new Date() }
        });

        const timestamp = F.discordTimestamp(addDays(application.submittedAt || new Date(), FB_DELAY_DAYS), "relative");

        embed.author.name = "Firebreathers Application Denied";
        embed.setDescription(`Unfortunately, your application for FB was denied. You may reapply ${timestamp}`);
        await ctx.editReply({ embeds: [msgEmbed.setColor("RED")] });
    } else throw new Error("Invalid action type");

    const doneByEmbed = new Embed()
        .setAuthor(ctx.member.displayName, ctx.member.displayAvatarURL())
        .setDescription(
            `${ctx.member} ${action === ActionTypes.Accept ? "accepted" : "denied"} ${member}'s FB application`
        )
        .setFooter(applicationId);

    // Archive thread
    const thread = ctx.message.thread;
    if (thread) {
        await thread.setArchived(true, "Decision was made, thread no longer necessary");

        doneByEmbed.addField("Thread", `${thread}`);
    }

    await ctx.followUp({ embeds: [doneByEmbed] });

    await F.sendMessageToUser(member, { embeds: [embed] });
});

export default command;
