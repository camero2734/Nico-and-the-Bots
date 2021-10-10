import { addDays } from "date-fns";
import { Guild, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { rollbar } from "../../../Helpers/logging/rollbar";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { FB_DELAY_DAYS, genApplicationLink, getActiveFirebreathersApplication } from "./_consts";

const command = new SlashCommand(<const>{
    description: "Opens an application to the Firebreathers role",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    if (ctx.user.id !== userIDs.me) throw new CommandError("This command is disabled");

    if (!ctx.member.roles.cache.has(roles.staff)) {
        throw new CommandError("This command is not available yet.");
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

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.displayAvatarURL())
        .setDescription(
            "Click the button below to open the application. It should be pre-filled with your **Application ID**, which is a one-time code. This code is only valid for you, and only once."
        )
        .addField("Application ID", applicationId);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", url: link, label: "Open Application" })
    ]);

    await ctx.editReply({ embeds: [embed], components: [actionRow] });
});

export async function sendToStaff(guild: Guild, applicationId: string, data: Record<string, string>): Promise<boolean> {
    try {
        const fbApplicationChannel = (await guild.channels.fetch(channelIDs.deapplications)) as TextChannel;

        const application = await prisma.firebreatherApplication.findUnique({ where: { applicationId } });
        if (!application) throw new Error("No application found");

        const member = await guild.members.fetch(application.userId);
        if (!member) throw new Error("No member found");

        const embed = new MessageEmbed()
            .setColor("RED")
            .setAuthor(`${member.displayName}'s application`, member.displayAvatarURL())
            .setFooter(applicationId);

        for (const [name, value] of Object.entries(data)) {
            embed.addField(name, value);
        }

        const actionRow = new MessageActionRow().addComponents([
            new MessageButton({ style: "SUCCESS", label: "Accept", customId: "accept" }),
            new MessageButton({ style: "DANGER", label: "Deny", customId: "deny" })
        ]);

        await fbApplicationChannel.send({ embeds: [embed], components: [actionRow] });

        return true;
    } catch (e) {
        if (e instanceof Error) rollbar.log(e);
        else rollbar.log(`${e}`);

        return false;
    }
}

export default command;
