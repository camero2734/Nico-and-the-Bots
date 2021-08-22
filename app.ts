import { registerFont } from "canvas";
import * as Discord from "discord.js";
import "source-map-support/register";
import { KeonsBot } from "./src/Altbots/shop";
import { TopfeedBot } from "./src/Altbots/topfeed/topfeed";
import { SacarverBot } from "./src/Altbots/welcome";
import { channelIDs, guildID } from "./src/Configuration/config";
import { NULL_CUSTOM_ID } from "./src/Configuration/definitions";
import secrets from "./src/Configuration/secrets";
import { updateUserScore } from "./src/Helpers";
import AutoReact from "./src/Helpers/auto-react";
import { registerAllEntrypoints } from "./src/Helpers/entrypoint-loader";
import { BotLogInteractionListener } from "./src/Helpers/interaction-listeners/bot-logs";
import { prisma } from "./src/Helpers/prisma-init";
import { extendPrototypes } from "./src/Helpers/prototype-extend";
import Scheduler from "./src/Helpers/scheduler";
import SlurFilter from "./src/Helpers/slur-filter";
import {
    ApplicationData,
    ContextMenus,
    InteractionHandlers,
    ReactionHandlers,
    SlashCommands
} from "./src/Structures/data";
import { InteractionEntrypoint } from "./src/Structures/EntrypointBase";
import { SlashCommand } from "./src/Structures/EntrypointSlashCommand";
import { ErrorHandler } from "./src/Structures/Errors";

const client = new Discord.Client({
    intents: [
        "GUILDS",
        "DIRECT_MESSAGES",
        "DIRECT_MESSAGE_REACTIONS",
        "GUILDS",
        "GUILD_BANS",
        "GUILD_EMOJIS_AND_STICKERS",
        "GUILD_MEMBERS",
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS"
        // "GUILD_INTEGRATIONS",
        // "GUILD_INVITES",
        // "GUILD_PRESENCES",
        // "GUILD_VOICE_STATES",
        // "GUILD_WEBHOOKS"
    ],
    partials: ["REACTION", "USER", "MESSAGE"]
});
const keonsBot = new KeonsBot();
const topfeedBot = new TopfeedBot();
let sacarverBot: SacarverBot;

extendPrototypes();

client.login(secrets.bots.nico);

console.log("Script started");

const entrypointsReady = registerAllEntrypoints();

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const guild = await client.guilds.fetch(guildID);

    await entrypointsReady;
    InteractionEntrypoint.registerAllCommands(guild);

    addManualInteractionHandlers();

    // await dynamicCommandSetup(commands);

    // topfeedBot = new TopfeedBot(connection);

    // await topfeedBot
    //     .checkAll()
    //     .catch(console.log)
    //     .finally(() => process.exit(0));

    sacarverBot = new SacarverBot();

    sacarverBot.beginWelcomingMembers();
    keonsBot.setupShop();
    setup();

    const botChan = guild.channels.cache.get(channelIDs.bottest) as Discord.TextChannel;
    await botChan.send({ embeds: [new Discord.MessageEmbed({ description: "Bot is running" })] });
    guild.members.fetch().then(() => {
        botChan.send({
            embeds: [new Discord.MessageEmbed({ description: `Fetched all ${guild.members.cache.size} members` })]
        });
    });
});

client.on("messageCreate", async (msg: Discord.Message) => {
    const wasSlur = await SlurFilter(msg);
    if (wasSlur) return;

    AutoReact(msg);
    updateUserScore(msg); // Add to score
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
    if (interaction.isCommand()) {
        const commandIdentifier = SlashCommand.getIdentifierFromInteraction(interaction);
        const command = SlashCommands.get(commandIdentifier);
        if (!command) return console.log(`Failed to find command ${commandIdentifier}`);

        command.run(interaction, undefined);
    } else if (interaction.isMessageComponent()) {
        if (interaction.customId === NULL_CUSTOM_ID) return;

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
    } else if (interaction.isContextMenu()) {
        const ctxMenuName = interaction.commandName;
        const contextMenu = ContextMenus.get(ctxMenuName);
        if (!contextMenu) return console.log(`Failed to find context menu ${ctxMenuName}`);

        contextMenu.run(interaction);
    }
});

function setup() {
    //LOAD FONTS
    const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
    for (const font of fonts) registerFont(`./src/Assets/fonts/${font}.ttf`, { family: "futura" });

    registerFont(`./src/Assets/fonts/FiraCode/Regular.ttf`, { family: "FiraCode" });

    registerFont(`./src/Assets/fonts/ArialNarrow/Regular.ttf`, { family: "'Arial Narrow'" });
    registerFont(`./src/Assets/fonts/ArialNarrow/Bold.ttf`, { family: "'Arial Narrow'", weight: "bold" });
    registerFont(`./src/Assets/fonts/ArialNarrow/BoldItalic.ttf`, { family: "'Arial Narrow'", weight: "bold", style: "italic" }); // prettier-ignore
    registerFont(`./src/Assets/fonts/ArialNarrow/Italic.ttf`, { family: "'Arial Narrow'", style: "italic" });

    Scheduler(client);
    topfeedBot.checkAll();
}

function addManualInteractionHandlers() {
    // Listens for "More Info" on items in log channels
    InteractionHandlers.set(BotLogInteractionListener.name, BotLogInteractionListener.interaction);
}

// async function dynamicCommandSetup(commands: Command[]): Promise<void> {
//     const guild = await client.guilds.fetch(guildID);

//     // Concert channels
//     const concertManager = new ConcertChannelManager(guild);
//     await concertManager.fetchConcerts();
//     await concertManager.checkChannels();

//     const concertsByCountry: Record<string, typeof concertManager["concertChannels"]> = {};

//     for (const concert of concertManager.concertChannels) {
//         const country =
//             concert.concert?.venue?.country
//                 .toLowerCase()
//                 .replace(/ +/g, "-")
//                 .replace(/[^\w-]/g, "")
//                 .substring(0, 32) || "other";
//         if (!concertsByCountry[country]) concertsByCountry[country] = [];
//         concertsByCountry[country].push(concert);
//     }

//     const rolesCommands = commands.find((c) => c.commandName === "roles");
//     const command = rolesCommands?.options?.find((o) => o.name === "concert") as ApplicationCommandOptionSubCommand;
//     if (!command) {
//         console.error("Couldn't find command");
//         return;
//     } else console.log(`Got command: ${command.description}`);

//     command.options = [];
//     for (const [countryName, allConcerts] of Object.entries(concertsByCountry)) {
//         const subdivisions = R.splitEvery(25, allConcerts);
//         for (let i = 0; i < subdivisions.length; i++) {
//             const concerts = subdivisions[i];
//             command.options.push({
//                 name: `${countryName}${i === 0 ? "" : i}`,
//                 description: `Select a concert in ${countryName}`,
//                 required: false,
//                 type: CommandOptionType.STRING,
//                 choices: concerts.map((c) => ({
//                     name: c.concert.title || c.concert.venue.name,
//                     value: c.channelID || ""
//                 }))
//             });
//         }
//     }

//     // console.log(command.options);
// }

export const NicoClient = client;
