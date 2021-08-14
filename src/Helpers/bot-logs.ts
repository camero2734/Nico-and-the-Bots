import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs } from "../Configuration/config";
import { SlashCommand } from "../Structures/EntrypointSlashCommand";
import F from "./funcs";
import { BotLogInteractionListener } from "./interaction-listeners/bot-logs";

function recoverFullCommandName(ctx: CommandInteraction) {
    const baseCommand = ctx.commandName;
    const subcommandGroup = ctx.options.getSubcommandGroup(false);
    const subcommand = ctx.options.getSubcommand(false);

    return [baseCommand, subcommandGroup, subcommand].filter((a) => a).join(" ");
}

async function logStaffCommand(ctx: typeof SlashCommand.GenericContextType) {
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

export const LogCommand = (ctx: typeof SlashCommand.GenericContextType) => {
    if (!ctx.isCommand()) return;

    if (ctx.commandName.startsWith("staff")) return logStaffCommand(ctx);
};
