import { userIDs } from "../../../../Configuration/config";
import { CommandError } from "../../../../Configuration/definitions";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../../../InteractionEntrypoints/scheduled/concert-channels";

const command = new SlashCommand({
  description: "Creates/updates concert channels",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

  const concertChannelManager = getConcertChannelManager(ctx.guild);
  await concertChannelManager.initialize();
  await concertChannelManager.checkChannels();
  await ctx.editReply("Done checking concert channels");

  await ctx.editReply({
    content: "Purged all concert channel info from the database.",
  });
});

export default command;
