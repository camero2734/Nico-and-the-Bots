import { registerFont } from "canvas";
import * as Discord from "discord.js";
import http from "http";
import "source-map-support/register";
import { KeonsBot } from "./src/Altbots/shop";
import topfeedBot from "./src/Altbots/topfeed/topfeed";
import { SacarverBot } from "./src/Altbots/welcome";
import { channelIDs, guildID, roles } from "./src/Configuration/config";
import { NULL_CUSTOM_ID_PREFIX } from "./src/Configuration/definitions";
import secrets from "./src/Configuration/secrets";
import { updateUserScore } from "./src/Helpers";
import AutoReact from "./src/Helpers/auto-react";
import { getConcertChannelManager } from "./src/Helpers/concert-channels";
import { registerAllEntrypoints } from "./src/Helpers/entrypoint-loader";
import { logEntrypointEvents } from "./src/Helpers/logging/entrypoint-events";
import "./src/Helpers/message-updates/_queue";
import { extendPrototypes } from "./src/Helpers/prototype-extend";
import Scheduler from "./src/Helpers/scheduler";
import SlurFilter from "./src/Helpers/slur-filter";
import {
    ContextMenus,
    InteractionHandlers,
    ReactionHandlers,
    SlashCommands
} from "./src/Structures/data";
import { InteractionEntrypoint } from "./src/Structures/EntrypointBase";
import { SlashCommand } from "./src/Structures/EntrypointSlashCommand";
import { ErrorHandler } from "./src/Structures/Errors";
import { AutocompleteListener, transformAutocompleteInteraction } from "./src/Structures/ListenerAutocomplete";


const client = new Discord.Client({
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
    partials: [Discord.Partials.Reaction, Discord.Partials.User, Discord.Partials.Message]
});
const keonsBot = new KeonsBot();
const sacarverBot = new SacarverBot();

extendPrototypes();

client.login(secrets.bots.nico);

console.log("Script started");

const entrypointsReady = registerAllEntrypoints();
export let guild: Discord.Guild;

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    guild = await client.guilds.fetch({ force: true, guild: guildID });

    await entrypointsReady;
    InteractionEntrypoint.registerAllCommands(guild);

    sacarverBot.beginWelcomingMembers();
    keonsBot.setupShop();
    setup();
    // startTopfeed();

    // Send started message
    const botChan = (await guild.channels.fetch(channelIDs.bottest)) as Discord.TextChannel;
    await botChan.send({ embeds: [new Discord.EmbedBuilder({ description: "Bot is running" })] });
    await guild.members.fetch();

    await botChan.send({
        embeds: [new Discord.EmbedBuilder({ description: `Fetched all ${guild.members.cache.size} members` })]
    });
});

client.on("messageCreate", async (msg: Discord.Message) => {
    const wasSlur = await SlurFilter(msg);
    if (wasSlur) return;

    AutoReact(msg);
    updateUserScore(msg); // Add to score
});

client.on("messageUpdate", async (oldMsg, newMsg) => {
    await SlurFilter(await newMsg.fetch());
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

        try {
            await interactionHandler.handler(
                interaction as any,
                interactionHandler.pattern.toDict(interaction.customId)
            );
        } catch (e) {
            ErrorHandler(interaction, e);
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
    const guild = await client.guilds.fetch(guildID);

    // Load fonts into node-canvas
    const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
    for (const font of fonts) registerFont(`./src/Assets/fonts/${font}.ttf`, { family: "futura" });

    registerFont(`./src/Assets/fonts/FiraCode/Regular.ttf`, { family: "FiraCode" });
    registerFont(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, { family: "'Arial Narrow'" });
    registerFont(`./src/Assets/fonts/ArialNarrow/Bold.ttf`, { family: "'Arial Narrow'", weight: "bold" });
    registerFont(`./src/Assets/fonts/ArialNarrow/BoldItalic.ttf`, { family: "'Arial Narrow'", weight: "bold", style: "italic" }); // prettier-ignore
    registerFont(`./src/Assets/fonts/ArialNarrow/Italic.ttf`, { family: "'Arial Narrow'", style: "italic" });

    Scheduler(client);
    topfeedBot.registerChecks();
    logEntrypointEvents();

    // Concert channels
    const concertManager = getConcertChannelManager(guild);
    await concertManager.fetchConcerts();
    await concertManager.checkChannels();
}

export const NicoClient = client;

const server = http.createServer();
server.listen(4242, "127.0.0.1");
