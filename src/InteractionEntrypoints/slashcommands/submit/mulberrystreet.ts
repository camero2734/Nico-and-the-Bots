import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import FileType from "file-type";
import { channelIDs, roles, userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { prisma, queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";

const command = new SlashCommand({
  description: "Submits an image, video, or audio file to #mulberry-street",
  options: [
    {
      name: "title",
      description: "The title of your piece of art",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "url",
      description: "A direct link to the image, video, or audio file. Max 50MB.",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
});

command.setHandler(async (ctx) => {
  const MAX_FILE_SIZE = 50000000; // 50MB
  const MS_24_HOURS = 1000 * 60 * 60 * 24; // 24 hours in ms
  const { title } = ctx.opts;
  const url = ctx.opts.url.trim();

  const chan = ctx.channel.guild.channels.cache.get(channelIDs.mulberrystreet) as TextChannel;

  if (!ctx.member.roles.cache.has(roles.artistmusician))
    throw new CommandError(
      `Only users with the <@&${roles.artistmusician}> role can submit to Mulberry Street Creations™`,
    );

  await ctx.deferReply({ ephemeral: true });

  // Only allow submissions once/day
  const dbUser = await queries.findOrCreateUser(ctx.user.id);
  const lastSubmitted = dbUser.lastCreationUpload ? dbUser.lastCreationUpload.getTime() : 0;

  if (Date.now() - lastSubmitted < MS_24_HOURS && ctx.user.id !== userIDs.me) {
    const ableToSubmitAgainDate = new Date(lastSubmitted + MS_24_HOURS);
    const timestamp = F.discordTimestamp(ableToSubmitAgainDate, "relative");
    throw new CommandError(`You've already submitted! You can submit again ${timestamp}.`);
  }

  // Validate and fetch url
  if (!F.isValidURL(url)) throw new CommandError("Invalid URL given");

  const res = await fetch(url, {
    body: JSON.stringify({ size: MAX_FILE_SIZE }),
  }).catch((e) => {
    console.log(e);
    throw new CommandError("Unable to get the file from that URL.");
  });

  const buffer = await res.arrayBuffer();

  const fileType = await FileType.fromBuffer(buffer);
  if (!fileType) throw new CommandError("An error occurred while parsing your file");

  if (!["audio", "video", "image"].some((mime) => fileType.mime.startsWith(mime))) {
    console.log(fileType);
    throw new CommandError("Invalid file type. Must be a url to an image, video, or audio file.");
  }

  const fileName = `${title.split(" ").join("-")}.${fileType.ext}`;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: ctx.member.displayName,
      iconURL: ctx.member.user.displayAvatarURL(),
    })
    .setColor(0xe3b3d8)
    .setTitle(`"${title}"`)
    .setDescription(
      `Would you like to submit this to <#${channelIDs.mulberrystreet}>? If not, you can safely dismiss this message.`,
    )
    .addFields([{ name: "URL", value: url }])
    .setFooter({
      text: "Courtesy of Mulberry Street Creations™",
      iconURL: "https://i.imgur.com/fkninOC.png",
    });

  const timedListener = new TimedInteractionListener(ctx, <const>["msYes"]);
  const [yesId] = timedListener.customIDs;

  const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("Submit").setCustomId(yesId),
  ]);

  await ctx.editReply({ embeds: [embed], components: [actionRow] });

  const [buttonPressed] = await timedListener.wait();
  if (buttonPressed !== yesId) {
    await ctx.editReply({
      embeds: [new EmbedBuilder({ description: "Submission cancelled." })],
      components: [],
    });
    return;
  }

  // User submitted it

  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { lastCreationUpload: new Date() },
  });

  embed.setDescription("Submitted.");
  const doneEmbed = embed;

  embed.setDescription("");
  embed.setFields([]);

  const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: fileName });

  if (fileType.mime.startsWith("image")) {
    embed.setImage(`attachment://${fileName}`);
  }

  const m = await chan.send({ embeds: [embed], files: [attachment] });
  m.react("💙");

  const newActionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("View post").setURL(m.url),
  ]);

  await ctx.editReply({ embeds: [doneEmbed], components: [newActionRow] });
});

export default command;
