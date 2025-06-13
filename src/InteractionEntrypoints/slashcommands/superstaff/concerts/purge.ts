import { userIDs } from "../../../../Configuration/config";
import { CommandError } from "../../../../Configuration/definitions";
import { SlashCommand } from "../../../../Structures/EntrypointSlashCommand";
import { prisma } from "../../../../Helpers/prisma-init";

const command = new SlashCommand({
  description: "Purges concert channel info from the database",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply();

  if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

  await ctx.guild.members.fetch();
  await prisma.concert.deleteMany();

  await ctx.editReply({
    content: "Purged all concert channel info from the database.",
  });
});

export default command;
