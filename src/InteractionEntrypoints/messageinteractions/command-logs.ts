/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { MessageInteraction } from "../../Structures/EntrypointMessageInteraction";
import { EntrypointEvents } from "../../Structures/Events";

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

// Creates embed w/ button that this Interaction acts on when pressed
EntrypointEvents.on("slashCommandFinished", async ({ entrypoint, ctx }) => {
    if (ctx.commandName !== "staff") return; // Only staff commands

    const member = ctx.member;
    const opts = ctx.opts as Record<string, string>;

    const commandName = entrypoint.identifier;
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
});

export default msgInt;
