import { EmbedBuilder } from "@discordjs/builders";
import { GlobalFonts } from "@napi-rs/canvas";
import Cron from "croner";
import * as Discord from "discord.js";
import { absurd } from "Tasks/absurd";
import { KeonsBot } from "./src/Altbots/shop";
import { SacarverBot } from "./src/Altbots/welcome";
import { channelIDs, guildID, roles } from "./src/Configuration/config";
import { NULL_CUSTOM_ID_PREFIX } from "./src/Configuration/definitions";
import secrets from "./src/Configuration/secrets";
import { updateUserScore } from "./src/Helpers";
import AutoReact from "./src/Helpers/auto-react";
import { registerAllEntrypoints } from "./src/Helpers/entrypoint-loader";
import { listenForTorchbearers } from "./src/Helpers/event-listeners/torchbearers";
import { logEntrypointEvents } from "./src/Helpers/logging/entrypoint-events";
import { createBackgroundEvent, createWideEvent, emitWideEvent, finalizeWideEvent, setBotContext } from "./src/Helpers/logging/wide-event";
import "./src/Helpers/message-updates/_queue";
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

export const client = new Discord.Client({
  intents: [
    "Guilds",
    "DirectMessages",
    "DirectMessageReactions",
    "GuildMessageReactions",
    "GuildBans",
    "GuildEmojisAndStickers",
    "GuildMembers",
    "GuildMessages",
    "GuildIntegrations",
    "GuildInvites",
    "GuildPresences",
    "GuildVoiceStates",
    "GuildWebhooks",
  ],
  partials: [Discord.Partials.Reaction, Discord.Partials.User, Discord.Partials.Message, Discord.Partials.Channel],
});

// Temporary fix for fetchShardCount being called in discord.js
if (!(client.ws as any).fetchShardCount && typeof client.ws.getShardCount === "function") {
  (client.ws as any).fetchShardCount = client.ws.getShardCount.bind(client.ws);
}

const keonsBot = new KeonsBot();
const sacarverBot = new SacarverBot();

client.login(secrets.bots.nico);

console.log("Logging in...");

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

client.on(Discord.Events.ClientReady, async () => {
  console.log("===================================");
  console.log("||                               ||");
  console.log("||      🚀 Nico logged in!       ||");
  console.log("||                               ||");
  console.log("===================================");

  guild = await client.guilds.fetch({ force: true, guild: guildID });

  const entrypoints = await entrypointsReady;
  InteractionEntrypoint.registerAllCommands(guild);

  sacarverBot.beginWelcomingMembers();
  keonsBot.setupShop();
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

  startPingServer();
});

async function getReplyInteractionId(msg: Discord.Message) {
  if (!msg.reference || msg.reference.type !== Discord.MessageReferenceType.Default) return;
  const repliedTo = await msg.fetchReference();
  if (repliedTo?.author.id !== client.user?.id) return;

  console.log("Potential reply interaction ID found");

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
    console.log("Old member was partial");
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

  const wideEvent = createBackgroundEvent("reaction_added");
  let hasError = false;
  for (const [name, handler] of ReactionHandlers.entries()) {
    const wasSuccessful = await handler(fullReaction, fullUser, async (promise) => {
      try {
        await promise;
      } catch (e) {
        const m = await fullUser.createDM();
        await ErrorHandler(m, wideEvent, e instanceof Error ? e : new Error(String(e)));
        hasError = true;
      }
    });
    if (wasSuccessful) {
      wideEvent.extended.handledVia = name;
      finalizeWideEvent(wideEvent, "success");
      emitWideEvent(wideEvent);
      return;
    }
  }

  if (hasError) {
    emitWideEvent(wideEvent);
  }

  // No handler successful, just a reaction that doesn't trigger anything
});

client.on(Discord.Events.InteractionCreate, async (interaction) => {
  const receivedInteractionAt = new Date();
  if (interaction.isChatInputCommand()) {
    const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
    const command = SlashCommands.get(commandIdentifier);
    if (!command) return console.log(`Failed to find command ${commandIdentifier}`);

    command.run(interaction, undefined);
  } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
    if (interaction.customId.startsWith(NULL_CUSTOM_ID_PREFIX)) return;

    const [interactionID] = interaction.customId.split(":");
    if (!interactionID) return;

    const interactionHandler = InteractionHandlers.get(interactionID);
    if (!interactionHandler) return;

    if ("webhookId" in interaction) await interaction.message?.fetchWebhook();
    if ("messageId" in interaction) await interaction.message?.fetch();

    const wideEvent = createWideEvent(interaction);
    setBotContext(wideEvent, "InteractionListener", interactionHandler.name);

    const ctx = interaction as ListenerInteraction;
    ctx.wideEvent = wideEvent;

    try {
      await interactionHandler.handler(ctx, interactionHandler.pattern.toDict(interaction.customId));
      finalizeWideEvent(wideEvent, "success");
    } catch (e) {
      finalizeWideEvent(wideEvent, "error", e);
      await ErrorHandler(interaction, wideEvent, e instanceof Error ? e : new Error(String(e)), interactionHandler.name, receivedInteractionAt);
    }

    emitWideEvent(wideEvent);
  } else if (interaction.isAutocomplete()) {
    const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
    const optionIdentifier = interaction.options.getFocused()?.name;

    const slashcommand = SlashCommands.get(commandIdentifier);
    if (!slashcommand) return console.log(`Failed to find command ${commandIdentifier} for autocomplete`);

    const autocomplete = slashcommand.autocompleteListeners.get(
      optionIdentifier,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ) as AutocompleteListener<any, any> | undefined;
    if (!autocomplete) return console.log(`Failed to find autocomplete ${commandIdentifier}::${optionIdentifier}`);

    autocomplete(transformAutocompleteInteraction(interaction));
  } else if (interaction.isContextMenuCommand()) {
    const ctxMenuName = interaction.commandName;
    const contextMenu = ContextMenus.get(ctxMenuName);
    if (!contextMenu) return console.log(`Failed to find context menu ${ctxMenuName}`);

    contextMenu.run(interaction);
  }
});

listenForTorchbearers(client);

async function setup() {
  GlobalFonts.registerFromPath("./src/Assets/fonts/f.ttf", "Futura");
  GlobalFonts.registerFromPath("./src/Assets/fonts/FiraCode/Regular.ttf", "FiraCode");
  GlobalFonts.registerFromPath("./src/Assets/fonts/ArialNarrow/Regular.ttf", "'Arial Narrow'");
  GlobalFonts.registerFromPath("./src/Assets/fonts/clancy.otf", "Clancy");

  console.log({
    "Registered fonts": GlobalFonts.families.map((f) => f.family).join(", "),
  });

  Scheduler(client);
  logEntrypointEvents();
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
    console.error("Unable to forward error to channel", msg);
    console.error(e);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  const stack = reason instanceof Error ? reason.stack : undefined;
  console.error("Unhandled Rejection at:", promise, "reason:", reason, stack);
  forwardMessageToErrorChannel(
    `Unhandled rejection:\n\nPromise:\n${promise}\n\nReason:\n${reason}\n\nStack:\n${stack}`,
  );
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown", err);
  forwardMessageToErrorChannel(`Uncaught exception:\n\n${err}\n\n${err.stack}`);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");

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
    console.error(e);
  }

  console.log("Shutdown complete, exiting.");
  process.exit(0);
});

export const NicoClient = client;
