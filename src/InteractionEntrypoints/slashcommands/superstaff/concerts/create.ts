import { getConcertChannelManager } from "../../../../InteractionEntrypoints/scheduled/concert-channels";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Creates/updates concert channels",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  const concertChannelManager = getConcertChannelManager(ctx.guild);
  await concertChannelManager.initialize();

  const totalChannels = concertChannelManager.concertChannels;
  const addedChannels = await concertChannelManager.checkChannels();

  await ctx.editReply(
    `Added ${addedChannels.length} channels. ${totalChannels.length} now exist in <#${concertChannelManager.forumChannel.id}>`,
  );
});

export default command;
