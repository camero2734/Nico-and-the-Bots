import { EmbedBuilder } from "@discordjs/builders";
import { startWorkers } from "@falcondev-oss/queue";
import { GlobalFonts } from "@napi-rs/canvas";
import Cron from "croner";
import * as Discord from "discord.js";
import { absurd } from "Tasks/absurd";
import { client } from "./src/Altbots/nico";
import { KeonsBot } from "./src/Altbots/shop";
import { SacarverBot } from "./src/Altbots/welcome";
import { channelIDs, guildID, roles } from "./src/Configuration/config";
import { NULL_CUSTOM_ID_PREFIX } from "./src/Configuration/definitions";
import secrets from "./src/Configuration/secrets";
import { updateUserScore } from "./src/Helpers";
import AutoReact from "./src/Helpers/auto-react";
import { registerAllEntrypoints } from "./src/Helpers/entrypoint-loader";
import { listenForTorchbearers } from "./src/Helpers/event-listeners/torchbearers";
import { jobs } from "./src/Helpers/jobs";
import { workerConnection } from "./src/Helpers/jobs/helpers";
import { createInteractionLogger, createJobLogger, log } from "./src/Helpers/logging/evlog";
import { prisma } from "./src/Helpers/prisma-init";
import Scheduler from "./src/Helpers/scheduler";
import {
  ContextMenus,
  InteractionHandlers,
  ReactionHandlers,
  ReplyHandlers,
  SlashCommands,
} from "./src/Structures/data";
import { InteractionEntrypoint } from "./src/Structures/EntrypointBase";
import { SlashCommand } from "./src/Structures/EntrypointSlashCommand";
import { ErrorHandler } from "./src/Structures/Errors";
import { type AutocompleteListener, transformAutocompleteInteraction } from "./src/Structures/ListenerAutocomplete";
import type { ListenerInteraction } from "./src/Structures/ListenerInteraction";

// Temporary fix for fetchShardCount being called in discord.js
if (!(client.ws as any).fetchShardCount && typeof client.ws.getShardCount === "function") {
  (client.ws as any).fetchShardCount = client.ws.getShardCount.bind(client.ws);
}

const sacarverBot = new SacarverBot();

client.login(secrets.bots.nico);

log.info({ stage: "startup", message: "Logging in..." });

const entrypointsReady = registerAllEntrypoints();
export let guild: Discord.Guild;

Cron("0 0 * * *", { timezone: "Europe/Amsterdam" }, async () => {
  if (!guild) return;

  // Update those who are in the server but are not marked as such
  const membersInServerIds = new Set((await guild.members.fetch()).keys());
  const inactiveUsers = new Set(
    (
      await prisma.user.findMany({
        select: { id: true },
        where: { currentlyInServer: false },
      })
    ).map((u) => u.id),
  );

  const membersMarkedInactive = membersInServerIds.intersection(inactiveUsers);

  await prisma.user.updateMany({
    where: { id: { in: Array.from(membersMarkedInactive) } },
    data: { currentlyInServer: true },
  });

  // Update those who are not in the server but are marked as such
  const activeUsers = new Set(
    (
      await prisma.user.findMany({
        select: { id: true },
        where: { currentlyInServer: true },
      })
    ).map((u) => u.id),
  );
  const leftMembers = Array.from(activeUsers.difference(membersInServerIds));
  const batchSize = 10000;

  for (let i = 0; i < leftMembers.length; i += batchSize) {
    const batch = leftMembers.slice(i, i + batchSize);
    await prisma.user.updateMany({
      where: { id: { in: batch } },
      data: { currentlyInServer: false },
    });
  }

  const chan = await guild.channels.fetch(channelIDs.bottest);
  if (!chan?.isSendable()) return;
  await chan.send({
    content: `Updated ${membersMarkedInactive.size} members to currentlyInServer = true and ${leftMembers.length} members to currentlyInServer = false`,
  });
});

client.once(Discord.Events.ClientReady, async () => {
  console.log("===================================");
  console.log("||                               ||");
  console.log("||      🚀 Nico logged in!       ||");
  console.log("||                               ||");
  console.log("===================================");

  guild = await client.guilds.fetch({ force: true, guild: guildID });

  const entrypoints = await entrypointsReady;
  InteractionEntrypoint.registerAllCommands(guild);

  sacarverBot.beginWelcomingMembers();
  log.info({ component: "shop", message: "about to set up shop" });
  const keonsBot = await KeonsBot.create();
  await keonsBot.setupShop();
  setup();

  // Send started message
  const botChan = (await guild.channels.fetch(channelIDs.bottest)) as Discord.TextChannel;
  await botChan.send({
    embeds: [
      new EmbedBuilder({
        description: "Bot is now running",
        footer: { text: secrets.commitSha || "No commit associated" },
      }),
    ],
  });
  await guild.members.fetch();

  await botChan.send({
    embeds: [
      new EmbedBuilder({
        description: `Fetched all ${guild.members.cache.size} members`,
      }),
    ],
  });

  for (const [_path, entrypoint] of entrypoints) {
    await entrypoint.runOnBotReady(guild, client);
  }

  await absurd.startWorker();
  const workers = await startWorkers(jobs, {
    connection: workerConnection,
    hooks: {
      error: (err) => {
        log.error({ message: String(err), error: String(err), ...{ worker: true } });
      },
      failed: (job, err) => {
        log.error({ message: String(err), error: String(err), ...{ worker: true, jobId: job?.id } });
      },
    },
  });
  log.info({ workers: Array.from(workers.keys()), message: `Started ${workers.size} workers` });

  startPingServer();
});

async function getReplyInteractionId(msg: Discord.Message) {
  if (!msg.reference || msg.reference.type !== Discord.MessageReferenceType.Default) return;
  const repliedTo = await msg.fetchReference();
  if (repliedTo?.author.id !== client.user?.id) return;

  log.info({ source: "message_reply", message: "Potential reply interaction ID found" });

  for (const component of repliedTo.components) {
    if (component.type !== Discord.ComponentType.ActionRow) continue;
    for (const btn of component.components) {
      if (btn.type !== Discord.ComponentType.Button) continue;
      if (!btn.customId?.startsWith("##!!RL") || !btn.customId?.endsWith("RL!!##")) continue;

      const replyId = btn.customId.replace(/^##!!RL/, "").replace(/RL!!##$/, "");
      return { replyId, repliedTo };
    }
  }
}

client.on(Discord.Events.MessageCreate, async (msg: Discord.Message) => {
  const { replyId, repliedTo } = (await getReplyInteractionId(msg)) || {};
  if (replyId && repliedTo) {
    const replyListener = ReplyHandlers.get(replyId);
    if (replyListener) return await replyListener(msg, repliedTo);
  }

  AutoReact(msg);
  updateUserScore(msg); // Add to score
});

// Voice state updates for VC role
client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
  const joinedVoiceChannel = !oldState.channelId && newState.channelId;
  const leftVoiceChannel = oldState.channelId && !newState.channelId;

  const member = newState.member;
  if (!member) return;

  if (joinedVoiceChannel) {
    await member.roles.add(roles.vc);
  } else if (leftVoiceChannel) {
    await member.roles.remove(roles.vc);
  }
});

// Pending member updates => give roles
client.on(Discord.Events.GuildMemberUpdate, async (oldMem, mem) => {
  if (!oldMem || oldMem.partial) {
    log.info({ event: "GuildMemberUpdate", message: "Old member was partial" });
    return;
  }
  const noLongerPending = oldMem.pending && !mem.pending;

  if (
    !noLongerPending ||
    mem.roles.cache.has(roles.banditos) ||
    mem.roles.cache.has(roles.muted) ||
    mem.roles.cache.has(roles.hideallchannels)
  )
    return;

  await mem.roles.add(roles.banditos);
  await mem.roles.add(roles.new);

  const testChannel = await guild.channels.fetch(channelIDs.bottest);
  if (!testChannel?.isTextBased()) throw new Error("Test channel is not text-based");

  await testChannel.send(`✅ ${mem.user.tag} passed membership screening`);
});

client.on(Discord.Events.MessageReactionAdd, async (reaction, user) => {
  const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
  const fullUser = user.partial ? await user.fetch() : user;

  const reactionLog = createJobLogger("reaction_handler");
  for (const [name, handler] of ReactionHandlers.entries()) {
    const wasSuccessful = await handler(fullReaction, fullUser, async (promise) => {
      try {
        await promise;
      } catch (e) {
        const m = await fullUser.createDM();
        await ErrorHandler(m, reactionLog, e instanceof Error ? e : new Error(String(e)));
        reactionLog.error(e instanceof Error ? e : new Error(String(e)));
        reactionLog.emit({ outcome: "error" });
        return;
      }
    });
    if (wasSuccessful) {
      reactionLog.set({ handledVia: name });
      reactionLog.emit({ outcome: "success" });
      return;
    }
  }

  // No handler successful, just a reaction that doesn't trigger anything
});

client.on(Discord.Events.InteractionCreate, async (interaction) => {
  const receivedInteractionAt = new Date();
  if (interaction.isChatInputCommand()) {
    const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
    const command = SlashCommands.get(commandIdentifier);
    if (!command) {
      log.warn({ command: commandIdentifier, message: "Failed to find command" });
      return;
    }

    command.run(interaction, undefined);
  } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
    if (interaction.customId.startsWith(NULL_CUSTOM_ID_PREFIX)) return;

    const [interactionID] = interaction.customId.split(":");
    if (!interactionID) return;

    const interactionHandler = InteractionHandlers.get(interactionID);
    if (!interactionHandler) return;

    if ("webhookId" in interaction) await interaction.message?.fetchWebhook();
    if ("messageId" in interaction) await interaction.message?.fetch();

    const interactionLog = createInteractionLogger(interaction);
    interactionLog.set({ bot: { entrypoint: "InteractionListener", identifier: interactionHandler.name } });

    const ctx = interaction as ListenerInteraction;
    ctx.log = interactionLog;

    try {
      await interactionHandler.handler(ctx, interactionHandler.pattern.toDict(interaction.customId));
      interactionLog.emit({ outcome: "success" });
    } catch (e) {
      interactionLog.error(e instanceof Error ? e : new Error(String(e)));
      interactionLog.emit({ outcome: "error" });
      await ErrorHandler(
        interaction,
        interactionLog,
        e instanceof Error ? e : new Error(String(e)),
        interactionHandler.name,
        receivedInteractionAt,
      );
    }
  } else if (interaction.isAutocomplete()) {
    const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
    const optionIdentifier = interaction.options.getFocused()?.name;

    const slashcommand = SlashCommands.get(commandIdentifier);
    if (!slashcommand) {
      log.warn({ command: commandIdentifier, message: "Failed to find command for autocomplete" });
      return;
    }

    const autocomplete = slashcommand.autocompleteListeners.get(
      optionIdentifier,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ) as AutocompleteListener<any, any> | undefined;
    if (!autocomplete) {
      log.warn({ command: commandIdentifier, option: optionIdentifier, message: "Failed to find autocomplete" });
      return;
    }

    autocomplete(transformAutocompleteInteraction(interaction));
  } else if (interaction.isContextMenuCommand()) {
    const ctxMenuName = interaction.commandName;
    const contextMenu = ContextMenus.get(ctxMenuName);
    if (!contextMenu) {
      log.warn({ contextMenu: ctxMenuName, message: "Failed to find context menu" });
      return;
    }

    contextMenu.run(interaction);
  }
});

listenForTorchbearers(client);

async function setup() {
  GlobalFonts.registerFromPath("./src/Assets/fonts/f.ttf", "Futura");
  GlobalFonts.registerFromPath("./src/Assets/fonts/FiraCode/Regular.ttf", "FiraCode");
  GlobalFonts.registerFromPath("./src/Assets/fonts/ArialNarrow/Regular.ttf", "'Arial Narrow'");
  GlobalFonts.registerFromPath("./src/Assets/fonts/clancy.otf", "Clancy");

  log.info({ fonts: GlobalFonts.families.map((f) => f.family), message: "Fonts registered" });

  Scheduler(client);
}

function startPingServer() {
  const started = Date.now();
  Bun.serve({
    port: 2121,
    fetch() {
      return new Response(`Nico is running. Uptime: ${Math.floor((Date.now() - started) / 1000)}s`);
    },
  });
}

async function forwardMessageToErrorChannel(msg: string) {
  try {
    const channel = await guild.channels.fetch(channelIDs.bottest);
    if (!channel?.isSendable()) return;

    const embed = new EmbedBuilder().setDescription(msg).setColor(Discord.Colors.Red);

    await channel.send({ embeds: [embed] });
  } catch (e) {
    log.error({ message: "Unable to forward error to channel", channel: channelIDs.bottest, originalMessage: msg });
    log.error({ message: e instanceof Error ? e.message : String(e), error: e instanceof Error ? e.message : String(e) });
  }
}

process.on("unhandledRejection", (reason, promise) => {
  const stack = reason instanceof Error ? reason.stack : undefined;
  log.error({ message: "Unhandled Rejection", ...{ promise: String(promise), reason: String(reason), stack } });
  forwardMessageToErrorChannel(
    `Unhandled rejection:\n\nPromise:\n${promise}\n\nReason:\n${reason}\n\nStack:\n${stack}`,
  );
});

process.on("uncaughtException", (err) => {
  log.error({ message: err.message, error: err.message, stack: err.stack, ...{ uncaughtException: true } });
  forwardMessageToErrorChannel(`Uncaught exception:\n\n${err}\n\n${err.stack}`);
});

process.on("SIGTERM", async () => {
  log.info({ signal: "SIGTERM", message: "Shutting down gracefully..." });

  try {
    const botChan = await guild.channels.fetch(channelIDs.bottest);
    if (botChan?.isTextBased()) {
      await botChan.send({
        embeds: [
          new EmbedBuilder({
            description: "Bot is restarting...",
            color: Discord.Colors.Yellow,
          }),
        ],
      });
    }

    await prisma.$disconnect();
    await client.destroy();
  } catch (e) {
    log.error({ message: e instanceof Error ? e.message : String(e), error: e instanceof Error ? e.message : String(e) });
  }

  log.info({ stage: "shutdown", message: "Shutdown complete, exiting." });
  process.exit(0);
});
