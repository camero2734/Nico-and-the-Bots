import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Creates a private thread to test perms",
  options: [
    {
      name: "user",
      description: "The user to add to the thread",
      required: true,
      type: ApplicationCommandOptionType.User,
    },
  ],
});

command.setHandler(async (ctx) => {
  if (ctx.user.id !== userIDs.me) throw new CommandError("You cannot use this command");

  await ctx.deferReply();

  const thread = await ctx.channel.threads.create({
    name: `threadtest-${Date.now()}`,
    type: ChannelType.PrivateThread,
    invitable: false,
  });

  try {
    await thread.members.add(ctx.opts.user);
    await ctx.editReply(`Created ${thread} and added <@${ctx.opts.user}> to it.`);
  } catch (e) {
    await ctx.editReply(`Created ${thread} but failed to add <@${ctx.opts.user}>: ${e}`);
  }
});

export default command;
