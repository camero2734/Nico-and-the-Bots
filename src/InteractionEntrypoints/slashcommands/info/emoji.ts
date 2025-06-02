import { ApplicationCommandOptionType, EmbedBuilder, type Snowflake, userMention } from "discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const names = <const>["emoji1", "emoji2", "emoji3", "emoji4", "emoji5"];

const command = new SlashCommand({
  description: "Retrieves information for an emoji",
  options: names.map(
    (name, idx) =>
      <const>{
        name,
        description: `Emoji #${idx} to look up information for`,
        required: idx === 0,
        type: ApplicationCommandOptionType.String,
      },
  ),
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();
  const emojis = Object.values(ctx.opts).filter((r): r is Snowflake => !!r);

  const embeds: EmbedBuilder[] = [];

  await ctx.guild.members.fetch();

  for (const emojiMention of emojis) {
    const emojiId = emojiMention.match(/\d+/)?.[0];
    if (!emojiId) continue;

    const emoji = await ctx.channel.guild.emojis.fetch(emojiId, {
      force: true,
    });
    if (!emoji) continue;

    const author = emoji.author?.id && (await ctx.guild.members.fetch(emoji.author.id));

    const embed = new EmbedBuilder();
    embed.setTitle(emoji.name);
    embed.addFields([{ name: "Created", value: `${emoji.createdAt}` }]);
    embed.addFields([{ name: "Animated", value: `${emoji.animated}` }]);
    if (author) embed.addFields([{ name: "Creator", value: userMention(author.user.id) }]);
    embed.addFields([{ name: "ID", value: emoji.id }]);
    embed.setThumbnail(emoji.imageURL({ extension: "png", size: 512 }));

    embeds.push(embed);
  }

  if (embeds.length === 0) throw new CommandError("A valid emoji was not provided.");

  await ctx.send({ embeds });
});

export default command;
