import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle, channelMention } from "discord.js";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { MessageTools } from "../../../Helpers";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
    description: "Bans a member",
    options: [
        { name: "user", description: "The member to ban", required: true, type: ApplicationCommandOptionType.User },
        {
            name: "purge",
            description: "Whether to delete all messages or not",
            required: false,
            type: ApplicationCommandOptionType.Boolean
        },
        {
            name: "reason",
            description: "Reason for banning",
            required: false,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "noappeal",
            description: "Don't include link for appealing the ban",
            required: false,
            type: ApplicationCommandOptionType.Boolean
        }
    ]
});

command.setHandler(async (ctx) => {
    const { user, purge, reason, noappeal } = ctx.opts;
    const member = await ctx.member.guild.members.fetch(user);
    if (!member) throw new CommandError("Could not find this member. They may have already been banned or left.");

    if (member.roles.cache.has(roles.staff) || member.user.bot) {
        throw new CommandError("You cannot ban a staff member or bot.");
    }

    const banReason = (reason || "No reason provided") + ` - Banned by ${ctx.member.displayName}`;

    const bannedEmbed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setDescription("You have been banned from the twenty one pilots Discord server")
        .addFields([{ name: "Reason", value: reason || "None provided" }])
        .setColor(Colors.Red);

    if (!noappeal) {
        bannedEmbed.addFields([{
            name: "Appeal",
            value: "You may appeal your ban by visiting:\ndiscordclique.com/appeals"
        }]);
    }

    await MessageTools.safeDM(member, { embeds: [bannedEmbed] });

    if (member.id !== userIDs.myAlt) {
        await member.ban({ deleteMessageDays: purge ? 7 : 0, reason: banReason });
    }

    await ctx.send({ embeds: [new EmbedBuilder({ description: `${member.toString()} was banned.` })] });

    // Send to ban log
    const logEmbed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setDescription("This user has been banned from the twenty one pilots Discord server")
        .setColor(Colors.Red)
        .setFooter({ text: "If you have any questions about this action, feel free to open a #support ticket." });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
            .setLabel("[STAFF] Update")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(genBtnId({}))
    );

    const banLogChannel = (await ctx.guild.channels.fetch(channelIDs.banlog)) as TextChannel;
    await banLogChannel.send({ embeds: [logEmbed], components: [actionRow] });
});

const FIELD_PUBLIC_BAN_REASON = "banReasonPublic";
const FIELD_INTERNAL_BAN_REASON = "banReasonInternal";
const genBtnId = command.addInteractionListener("editBanDetails", [], async (ctx) => {
    if (!ctx.isButton()) return;
    if (!ctx.member.roles.cache.has(roles.staff)) throw new CommandError(`You must be a staff member to do this. If you have any questions, feel free to open a ticket in ${channelMention(channelIDs.ticketSupport)}`);

    const modal = new ModalBuilder()
        .setCustomId(genSubmitId({}))
        .setTitle("Edit ban details");

    const publicActionRow = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setLabel("Public ban reason")
            .setPlaceholder("Reasons for ban. Be as thorough as possible.")
            .setCustomId(FIELD_PUBLIC_BAN_REASON)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
    );

    const internalActionRow = new ActionRowBuilder<TextInputBuilder>().setComponents(
        new TextInputBuilder()
            .setLabel("Internal ban notes")
            .setPlaceholder("Internal notes. Only available to staff.")
            .setCustomId(FIELD_INTERNAL_BAN_REASON)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
    );

    modal.setComponents([publicActionRow, internalActionRow]);

    await ctx.showModal(modal);
});

const genSubmitId = command.addInteractionListener("editBanDetailsSubmit", [], async (ctx) => {
    if (!ctx.isModalSubmit()) return;

    await ctx.deferReply({ ephemeral: true });

    const newBanReason = ctx.fields.getTextInputValue(FIELD_PUBLIC_BAN_REASON);
    const newInternalBanReason = ctx.fields.getTextInputValue(FIELD_INTERNAL_BAN_REASON);

    const embed = new EmbedBuilder(ctx.message.embeds[0].toJSON());
    embed.addFields({ name: "Reason", value: newBanReason });

    await ctx.message.edit({ embeds: [embed] });
    await ctx.editReply({ content: `Ban details updated. Also noted:\n${newInternalBanReason}` })
});

export default command;
