/* eslint-disable @typescript-eslint/no-explicit-any */
import { GuildMember, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { InteractionEntrypoint } from "../../Structures/EntrypointBase";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";
import { SlashCommand } from "../../Structures/EntrypointSlashCommand";
import { OptsType, SlashCommandData } from "../../Structures/SlashCommandOptions";

const msgInt = new MessageInteraction();
const args = <const>["title"];
const GenStaffDiscussId = msgInt.addInteractionListener("discussEmbedStaff", args, async (ctx, args) => {
    await ctx.update({ components: [] });
    const embed = ctx.message.embeds[0];

    const staffChan = (await ctx.guild.channels.fetch(channelIDs.staff)) as TextChannel;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", label: "View original", url: ctx.message.url })
    ]);
    const msg = await staffChan.send({ embeds: [embed], components: [actionRow] });
    const thread = await msg.startThread({ name: args.title, autoArchiveDuration: 60 });

    const threadEmbed = new MessageEmbed()
        .setTitle(args.title)
        .setAuthor(`${ctx.member.displayName} requested discussion`, ctx.user.displayAvatarURL())
        .setDescription("Feel free to discuss this incident in this thread");

    await thread.send({ embeds: [threadEmbed] });
});

export async function sendStaffUsedCommandEmbed(
    command: InteractionEntrypoint<any, any>,
    member: GuildMember,
    opts?: Record<string, any>
): Promise<void> {
    const commandName = command.identifier;
    const args = opts
        ? Object.entries(opts)
              .map(([key, val]) => `\`${key}\`: ${val}`)
              .join(", ")
        : "*None*";
    const embed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle(`${commandName} used`)
        .addField("Args", args)
        .addField("Used", F.discordTimestamp(new Date(), "relative"));

    const staffCommandLogChan = (await member.guild.channels.fetch(channelIDs.logs.staffCommands)) as TextChannel;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "PRIMARY",
            label: "Discuss in #staff",
            customId: GenStaffDiscussId({ title: `${commandName} used by ${member.displayName}` })
        })
    ]);

    await staffCommandLogChan.send({ embeds: [embed], components: [actionRow] });
}

export default msgInt;
