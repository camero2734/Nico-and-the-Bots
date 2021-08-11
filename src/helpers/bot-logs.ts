import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs } from "../configuration/config";
import F from "./funcs";
import { BotLogInteractionListener } from "./interaction-listeners/bot-logs";
import { ExtendedInteraction, SlashCommand } from "./slash-command";

function recoverFullCommandName(ctx: CommandInteraction) {
    const baseCommand = ctx.commandName;
    const subcommandGroup = ctx.options.getSubCommandGroup(false);
    const subcommand = ctx.options.getSubCommand(false);

    return [baseCommand, subcommandGroup, subcommand].filter((a) => a).join(" ");
}

async function logStaffCommand(ctx: ExtendedInteraction) {
    const staffLog = (await ctx.guild.channels.fetch(channelIDs.logs.staffCommands)) as TextChannel;
    if (!staffLog || !ctx.isCommand()) return;

    const command = `\`/${recoverFullCommandName(ctx)}\``;

    const reply = (await ctx.fetchReply()) as Message;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.user.displayAvatarURL())
        .addField("Command", command, true)
        .addField("At", F.discordTimestamp(ctx.createdAt, "shortDateTime"), true);

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            label: "More info",
            style: "SECONDARY",
            customId: BotLogInteractionListener.genCustomId({})
        }),
        new MessageButton({
            label: "View message",
            style: "LINK",
            url: reply.url
        })
    ]);

    await staffLog.send({ embeds: [embed], components: [actionRow] });
}

export const LogCommand = (ctx: ExtendedInteraction) => {
    if (!ctx.isCommand()) return;

    if (ctx.commandName.startsWith("staff")) return logStaffCommand(ctx);
};
