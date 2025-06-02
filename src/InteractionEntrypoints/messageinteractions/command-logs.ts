import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type TextChannel } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import F from "../../Helpers/funcs";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { EntrypointEvents } from "../../Structures/Events";

const msgInt = new ManualEntrypoint();

const args = <const>["title"];
const GenStaffDiscussId = msgInt.addInteractionListener("discussEmbedStaff", args, async (ctx, args) => {
  const reply = await ctx.fetchReply();
  await reply.edit({ components: [] });

  const embed = ctx.message.embeds[0];

  const staffChan = (await ctx.guild.channels.fetch(channelIDs.staff)) as TextChannel;

  const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("View original").setURL(ctx.message.url),
  ]);
  const msg = await staffChan.send({
    embeds: [embed],
    components: [actionRow],
  });
  const thread = await msg.startThread({
    name: args.title,
    autoArchiveDuration: 60,
  });

  const threadEmbed = new EmbedBuilder()
    .setTitle(args.title)
    .setAuthor({
      name: `${ctx.member.displayName} requested discussion`,
      iconURL: ctx.user.displayAvatarURL(),
    })
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

  const embed = new EmbedBuilder()
    .setAuthor({
      name: member.displayName,
      iconURL: member.user.displayAvatarURL(),
    })
    .setTitle(`${commandName} used`)
    .addFields([{ name: "Args", value: args }])
    .addFields([{ name: "Used", value: F.discordTimestamp(new Date(), "relative") }]);

  const staffCommandLogChan = (await member.guild.channels.fetch(channelIDs.logs.staffCommands)) as TextChannel;

  const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Discuss in #staff")
      .setCustomId(
        GenStaffDiscussId({
          title: `${commandName} used by ${member.displayName}`,
        }),
      ),
  ]);

  await staffCommandLogChan.send({ embeds: [embed], components: [actionRow] });
});

export default msgInt;
