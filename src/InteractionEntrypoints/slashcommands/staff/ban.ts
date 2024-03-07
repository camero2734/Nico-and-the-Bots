import { ApplicationCommandOptionType, Colors, EmbedBuilder, TextChannel } from "discord.js";
import { channelIDs, roles } from "../../../Configuration/config";
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
    await member.ban({ deleteMessageDays: purge ? 7 : 0, reason });
    await ctx.send({ embeds: [new EmbedBuilder({ description: `${member.toString()} was banned.` }).toJSON()] });

    sendToBanLog(ctx, bannedEmbed);
});

async function sendToBanLog(ctx: typeof command.ContextType, bannedEmbed: EmbedBuilder) {
    const banLogChannel = (await ctx.guild.channels.fetch(channelIDs.banlog)) as TextChannel;
    await banLogChannel.send({ embeds: [bannedEmbed] });
}

export default command;
