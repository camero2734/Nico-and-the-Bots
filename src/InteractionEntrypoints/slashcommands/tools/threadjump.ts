import { type AnyThreadChannel, MessageFlags } from "discord.js";
import { ActionRowBuilder, LinkButtonBuilder } from "@discordjs/builders";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand({
  description: "Sends a link to the first message in the thread",
  options: [],
});

command.setHandler(async (ctx) => {
  await ctx.deferReply({ flags: MessageFlags.Ephemeral });

  const thread = ctx.channel as unknown as AnyThreadChannel;

  if (!thread.isThread()) {
    throw new CommandError("This command can only be used in a thread");
  }

  const msg = await thread.messages
    .fetch({
      limit: 1,
      after: thread.id,
      cache: false,
    })
    .then((messages) => messages.first())
    .catch(() => null);

  if (!msg) {
    throw new CommandError("Failed to fetch the thread's starter message");
  }

  const actionRow = new ActionRowBuilder().addComponents(new LinkButtonBuilder().setLabel("Jump to message").setURL(msg.url));

  await ctx.editReply({
    content: "Here's the link to the first message in this thread",
    components: [actionRow],
  });
});

export default command;
