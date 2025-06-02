import { GlobalFonts } from "@napi-rs/canvas";
import Cron from "croner";
import * as Discord from "discord.js";
import { KeonsBot } from "./src/Altbots/shop";
import { fetchTwitter } from "./src/Altbots/topfeed/twitter/fetch-and-send";
import topfeedBot from "./src/Altbots/topfeed/topfeed";
import { SacarverBot } from "./src/Altbots/welcome";
import { channelIDs, guildID, roles } from "./src/Configuration/config";
import { NULL_CUSTOM_ID_PREFIX } from "./src/Configuration/definitions";
import secrets from "./src/Configuration/secrets";
import { updateUserScore } from "./src/Helpers";
import AutoReact from "./src/Helpers/auto-react";
import { registerAllEntrypoints } from "./src/Helpers/entrypoint-loader";
import { logEntrypointEvents } from "./src/Helpers/logging/entrypoint-events";
import "./src/Helpers/message-updates/_queue";
import { prisma } from "./src/Helpers/prisma-init";
import { extendPrototypes } from "./src/Helpers/prototype-extend";
import Scheduler from "./src/Helpers/scheduler";
import { InteractionEntrypoint } from "./src/Structures/EntrypointBase";
import { SlashCommand } from "./src/Structures/EntrypointSlashCommand";
import { ErrorHandler } from "./src/Structures/Errors";
import { AutocompleteListener, transformAutocompleteInteraction } from "./src/Structures/ListenerAutocomplete";
import {
    ContextMenus,
    InteractionHandlers,
    ReactionHandlers,
    ReplyHandlers,
    SlashCommands
} from "./src/Structures/data";

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
        "GuildWebhooks"
    ],
    partials: [Discord.Partials.Reaction, Discord.Partials.User, Discord.Partials.Message, Discord.Partials.Channel],
});
const keonsBot = new KeonsBot();
const sacarverBot = new SacarverBot();

extendPrototypes();

client.login(secrets.bots.nico);

console.log("Logging in...");

const entrypointsReady = registerAllEntrypoints();
export let guild: Discord.Guild;

Cron("0 0 * * *", { timezone: "Europe/Amsterdam" }, async () => {
    if (!guild) return;

    // Update those who are in the server but are not marked as such
    const membersInServerIds = new Set((await guild.members.fetch()).keys());
    const inactiveUsers = new Set((await prisma.user.findMany({
        select: { id: true },
        where: { currentlyInServer: false }
    })).map((u) => u.id));

    const membersMarkedInactive = membersInServerIds.intersection(inactiveUsers);

    await prisma.user.updateMany({
        where: { id: { in: Array.from(membersMarkedInactive) } },
        data: { currentlyInServer: true }
    });

    // Update those who are not in the server but are marked as such
    const activeUsers = new Set((await prisma.user.findMany({
        select: { id: true },
        where: { currentlyInServer: true }
    })).map((u) => u.id));
    const leftMembers = Array.from(activeUsers.difference(membersInServerIds));
    const batchSize = 10000;

    for (let i = 0; i < leftMembers.length; i += batchSize) {
        const batch = leftMembers.slice(i, i + batchSize);
        await prisma.user.updateMany({
            where: { id: { in: batch } },
            data: { currentlyInServer: false }
        });
    }

    const chan = await guild.channels.fetch(channelIDs.bottest);
    if (!chan?.isSendable()) return;
    await chan.send({
        content: `Updated ${membersMarkedInactive.size} members to currentlyInServer = true and ${leftMembers.length} members to currentlyInServer = false`
    })
});

client.on("ready", async () => {
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
    await botChan.send({ embeds: [new Discord.EmbedBuilder({ description: "Bot is now running", footer: { text: secrets.commitSha || "No commit associated" } })] });
    await guild.members.fetch();

    await botChan.send({
        embeds: [new Discord.EmbedBuilder({ description: `Fetched all ${guild.members.cache.size} members` })]
    });

    for (const [_path, entrypoint] of entrypoints) {
        await entrypoint.runOnBotReady(guild, client);
    }

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

client.on("messageCreate", async (msg: Discord.Message) => {
    const { replyId, repliedTo } = await getReplyInteractionId(msg) || {};
    if (replyId && repliedTo) {
        const replyListener = ReplyHandlers.get(replyId);
        if (replyListener) return await replyListener(msg, repliedTo);
    }

    AutoReact(msg);
    updateUserScore(msg); // Add to score
});

client.on("guildMemberUpdate", async (oldMem, newMem) => {
    if (!oldMem.roles.cache.has(roles.deatheaters) && newMem.roles.cache.has(roles.deatheaters)) {
        const fbAnnouncementChannel = await newMem.guild.channels.fetch(channelIDs.fairlyannouncements) as Discord.TextChannel; // prettier-ignore
        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: newMem.displayName, iconURL: newMem.displayAvatarURL() })
            .setDescription(`${newMem} has learned to fire breathe. Ouch.`)
            .setFooter({ text: "PROPERTY OF DRAGON'S DEN INC.™️", iconURL: newMem.client.user?.displayAvatarURL() });

        await fbAnnouncementChannel.send({ embeds: [embed] });
    }
});

client.on("messageReactionAdd", async (reaction, user) => {
    const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
    const fullUser = user.partial ? await user.fetch() : user;

    for (const [name, handler] of ReactionHandlers.entries()) {
        const wasSuccessful = await handler(fullReaction, fullUser, async (promise) => {
            try {
                await promise;
            } catch (e) {
                const m = await fullUser.createDM();
                ErrorHandler(m, e);
            }
        });
        if (wasSuccessful) {
            console.log(`[Reaction] ${name}`);
            return;
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    const receivedInteractionAt = new Date();
    if (interaction.isChatInputCommand()) {
        const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
        const command = SlashCommands.get(commandIdentifier);
        if (!command) return console.log(`Failed to find command ${commandIdentifier}`);

        command.run(interaction, undefined);
    } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(NULL_CUSTOM_ID_PREFIX)) return;

        console.log(`Got interaction: ${interaction.customId}`);
        const [interactionID] = interaction.customId.split(":");
        if (!interactionID) return;

        const interactionHandler = InteractionHandlers.get(interactionID);
        if (!interactionHandler) return;

        if ('webhookId' in interaction) await interaction.message?.fetchWebhook();
        if ('messageId' in interaction) await interaction.message?.fetch();

        try {
            console.log("Handling interaction via:", interactionHandler.name);
            await interactionHandler.handler(
                interaction as any,
                interactionHandler.pattern.toDict(interaction.customId)
            );
        } catch (e) {
            console.log("Error in interaction handler", e);
            ErrorHandler(interaction, e, interactionHandler.name, receivedInteractionAt);
        }
    } else if (interaction.isAutocomplete()) {
        const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
        const optionIdentifier = interaction.options.getFocused(true)?.name;

        const slashcommand = SlashCommands.get(commandIdentifier);
        if (!slashcommand) return console.log(`Failed to find command ${commandIdentifier} for autocomplete`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const autocomplete = slashcommand.autocompleteListeners.get(optionIdentifier) as AutocompleteListener<any, any> | undefined; // prettier-ignore
        if (!autocomplete) return console.log(`Failed to find autocomplete ${commandIdentifier}::${optionIdentifier}`);

        autocomplete(transformAutocompleteInteraction(interaction));
    } else if (interaction.isContextMenuCommand()) {
        const ctxMenuName = interaction.commandName;
        const contextMenu = ContextMenus.get(ctxMenuName);
        if (!contextMenu) return console.log(`Failed to find context menu ${ctxMenuName}`);

        contextMenu.run(interaction);
    }
});

async function setup() {
    GlobalFonts.registerFromPath(`./src/Assets/fonts/f.ttf`, "Futura");
    GlobalFonts.registerFromPath(`./src/Assets/fonts/FiraCode/Regular.ttf`, "FiraCode");
    GlobalFonts.registerFromPath(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, "'Arial Narrow'");
    GlobalFonts.registerFromPath(`./src/Assets/fonts/clancy.otf`, "Clancy");

    Scheduler(client);
    topfeedBot.registerChecks();
    logEntrypointEvents();
}

function startPingServer() {
    const started = Date.now();
    Bun.serve({
        port: 2121,
        routes: {
            "/api/topfeed": {
                POST: async (req) => {
                    if (req.headers.get("Authorization") !== secrets.webhookSecret) {
                        return new Response("Unauthorized", { status: 401 });
                    }

                    fetchTwitter("webhook");

                    return new Response("OK");
                }
            }
        },
        fetch() {
            return new Response(
                `Nico is running. Uptime: ${Math.floor((Date.now() - started) / 1000)}s`,
            );
        }
    })
}

async function forwardMessageToErrorChannel(msg: string) {
    try {
        const channel = await guild.channels.fetch(channelIDs.bottest);
        if (!channel?.isSendable()) return;

        const embed = new Discord.EmbedBuilder()
            .setDescription(msg)
            .setColor("Red");

        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error("Unable to forward error to channel", msg);
    }
}

process.on("unhandledRejection", (reason, promise) => {
    const stack = reason instanceof Error ? reason.stack : undefined;
    console.error("Unhandled Rejection at:", promise, "reason:", reason, stack);
    forwardMessageToErrorChannel(`Unhandled rejection:\n\nPromise:\n${promise}\n\nReason:\n${reason}\n\nStack:\n${stack}`);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception thrown", err);
    forwardMessageToErrorChannel(`Uncaught exception:\n\n${err}\n\n${err.stack}`);
});

export const NicoClient = client;
