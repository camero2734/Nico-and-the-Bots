import {
    ActionRowBuilder,
    AttachmentBuilder,
    BaseMessageOptions,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SelectMenuBuilder,
    SelectMenuOptionBuilder,
    TextChannel
} from "discord.js";
import { roles } from "../../Configuration/config";
import { CommandError, NULL_CUSTOM_ID, NULL_CUSTOM_ID_PREFIX } from "../../Configuration/definitions";
import F from "../../Helpers/funcs";
import { prisma } from "../../Helpers/prisma-init";
import { MessageContextMenu } from "../../Structures/EntrypointContextMenu";

const ReportReasons = <const>{
    BEING_RUDE: "Being rude or bothersome to others",
    DRAMA: "Unnecessary drama",
    SPAM: "Spamming messages/images/etc.",
    NSFW_SLURS: "Slurs, NSFW, or other highly inappropriate content",
    OFF_TOPIC: "Being off-topic"
};

type ReportReasonsType = typeof ReportReasons;

const ctxMenu = new MessageContextMenu("🚩 Report message");

ctxMenu.setHandler(async (ctx, msg) => {
    await ctx.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
        .setTitle("Report message")
        .setDescription(
            "If you want to report this message to the server staff, please choose the reason in the dropdown below.\n\nIf this was an accident, you may safely ignore this message"
        );

    const selectMenu = new SelectMenuBuilder()
        .setCustomId(genId({ channelId: msg.channelId, messageId: msg.id }))
        .addOptions(
            Object.entries(ReportReasons).map(([key, value]) => new SelectMenuOptionBuilder({ label: value, value: key }).toJSON())
        );

    const actionRow = new ActionRowBuilder<SelectMenuBuilder>().setComponents([selectMenu]);

    await ctx.editReply({ embeds: [embed], components: [actionRow] });
});

const NUM_PEOPLE_TEXT = (num: number) => `${num} report${F.plural(num)}`;

const genId = ctxMenu.addInteractionListener("reportMessage", <const>["channelId", "messageId"], async (ctx, args) => {
    if (!ctx.isSelectMenu()) throw new Error("Invalid interaction type");

    await ctx.deferUpdate();

    const selectedReason = ctx.values[0] as keyof ReportReasonsType;
    if (!selectedReason) throw new Error("No value selected");

    const reasonText = ReportReasons[selectedReason];

    const { channelId, messageId } = args;

    const chan = (await ctx.guild.channels.fetch(channelId)) as TextChannel;
    const msg = await chan.messages.fetch(messageId);
    const msgMember = await ctx.guild.members.fetch(msg.author.id);

    if (!msg) throw new CommandError("This message appears to have already been deleted.");
    if (!msgMember) throw new CommandError("Could not find member who sent this message.");

    // Ensure this user hasn't reported before
    const userPreviousReport = await prisma.userMessageReport.findUnique({
        where: { messageUrl_reportedByUserId: { messageUrl: msg.url, reportedByUserId: ctx.user.id } }
    });
    if (userPreviousReport) throw new CommandError("You already reported this message!");

    // Check if reports already exist for this user
    const priorReports = await prisma.userMessageReport.findMany({
        where: { messageUrl: msg.url },
        select: { staffMessageUrl: true }
    });

    if (priorReports.length > 0) {
        const { staffMessageUrl } = priorReports[0];
        const { channelId, messageId } = F.parseMessageUrl(staffMessageUrl) || {};
        if (!channelId || !messageId) throw new Error("Invalid message url stored");

        const staffChan = (await ctx.guild.channels.fetch(channelId)) as TextChannel;
        const staffMsg = await staffChan.messages.fetch(messageId);
        if (!staffMsg) throw new Error("The message disappeared"); // TODO: Delete from DB?

        const actionRow = staffMsg.components[0];
        const btn = actionRow.components.find((c) => c.customId?.startsWith(NULL_CUSTOM_ID_PREFIX));
        if (btn?.type !== ComponentType.Button) throw new Error("The button disappeared");

        // @ts-ignore
        btn.label = NUM_PEOPLE_TEXT(priorReports.length + 1);

        const embed = new EmbedBuilder()
            .setDescription("A new report was added for this message")
            .addFields([{ name: "Reason", value: reasonText }])
            .setFooter({ text: `Reported by ${ctx.member.displayName}`, iconURL: ctx.member.displayAvatarURL() });

        await prisma.userMessageReport.create({
            data: {
                reportedUserId: msg.author.id,
                reportedByUserId: ctx.user.id,
                reason: reasonText,
                messageUrl: msg.url,
                staffMessageUrl
            }
        });

        await staffMsg.edit({ components: [actionRow] });
        await staffMsg.reply({ embeds: [embed] });
    } else {
        const staffEmbed = new EmbedBuilder()
            .setAuthor({ name: msgMember.displayName, iconURL: msgMember.displayAvatarURL() })
            .setTitle("Message Reported")
            .setDescription(msg.content)
            .addFields([{ name: "Reason", value: ReportReasons[selectedReason] }])
            .setFooter({ text: `Reported by ${ctx.member.displayName}`, iconURL: ctx.member.displayAvatarURL() });

        const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
            new ButtonBuilder()
                .setLabel(NUM_PEOPLE_TEXT(1))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
                .setCustomId(NULL_CUSTOM_ID()),
            new ButtonBuilder().setLabel("View message").setStyle(ButtonStyle.Link).setURL(msg.url)
        ]);

        const msgOpts: BaseMessageOptions = { embeds: [staffEmbed], components: [actionRow] };

        const image = msg.attachments.filter((a) => !!a.contentType?.startsWith("image")).first();
        if (image) {
            const attachment = new AttachmentBuilder(image.url, { name: "file.png" });
            if (selectedReason === "NSFW_SLURS") attachment.setSpoiler(true);
            msgOpts.files = [attachment];
            staffEmbed.setImage("attachment://file.png");
        }

        const staffChan = (await ctx.guild.channels.fetch("815016457669705778")) as TextChannel;
        const m = await staffChan.send(msgOpts);

        // Save to DB
        await prisma.userMessageReport.create({
            data: {
                reportedUserId: msg.author.id,
                reportedByUserId: ctx.user.id,
                reason: reasonText,
                messageUrl: msg.url,
                staffMessageUrl: m.url
            }
        });
    }

    await ctx.editReply({
        embeds: [new EmbedBuilder({ description: "Your report has been submitted." })],
        components: []
    });
});

ctxMenu.addPermission(roles.banditos, true);

export default ctxMenu;
