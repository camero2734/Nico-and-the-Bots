import { registerFont } from "canvas";
import { Command, CommandComponentListener, CommandReactionHandler } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as Discord from "discord.js";
import * as helpers from "helpers";
import SlurFilter from "helpers/slur-filter";
import AutoReact from "helpers/auto-react";
import { updateUserScore } from "helpers";
import { CommandOptionType, GatewayServer, SlashCreator } from "slash-create";
import { Connection } from "typeorm";
import { KeonsBot } from "./src/altbots/shop";
import { SacarverBot } from "./src/altbots/welcome";
import { channelIDs, guildID } from "configuration/config";
import ConcertChannelManager from "helpers/concert-channels";
import R from "ramda";
import { TopfeedBot } from "altbots/topfeed/topfeed";
import Scheduler from "./src/helpers/scheduler";

// let ready = false;
let connection: Connection;

const client = new Discord.Client({ intents: Discord.Intents.ALL, partials: ["REACTION", "USER", "MESSAGE"] });
const keonsBot = new KeonsBot();
let topfeedBot: TopfeedBot;
let sacarverBot: SacarverBot;

const interactions = new SlashCreator({
    applicationID: "470410168186699788",
    token: secrets.bots.nico,
    defaultImageFormat: "png"
});

const reactionHandlers: CommandReactionHandler[] = [];
const interactionHandlers: CommandComponentListener[] = [];

client.login(secrets.bots.nico);

console.log("Script started");

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const commands: Command[] = [];

    // Initialize everything
    await Promise.all([
        // Wait until commands are loaded, connected to database, etc.
        helpers.loadCommands(commands, reactionHandlers, interactionHandlers, interactions),
        new Promise((resolve) => {
            helpers.connectToDatabase().then((c) => {
                connection = c;
                resolve(true);
            });
        })
    ]);

    await dynamicCommandSetup(commands);

    // topfeedBot = new TopfeedBot(connection);

    // await topfeedBot
    //     .checkAll()
    //     .catch(console.log)
    //     .finally(() => process.exit(0));

    interactions
        .withServer(new GatewayServer((handler) => client.ws.on("INTERACTION_CREATE" as Discord.WSEventType, handler)))
        .registerCommands(commands, false)
        .syncCommands()
        .syncCommandPermissions();

    // Set the database connection on each command
    const loadedCommands = interactions.commands as unknown as Discord.Collection<string, Command>;
    loadedCommands.forEach((c) => {
        c.setConnectionClient(connection, client);
    });

    sacarverBot = new SacarverBot(connection);

    sacarverBot.beginWelcomingMembers();
    keonsBot.setupShop();
    setup();

    const guild = await client.guilds.fetch(guildID);
    const botChan = guild.channels.cache.get(channelIDs.bottest) as Discord.TextChannel;
    await botChan.send({ embeds: [new Discord.MessageEmbed({ description: "Bot is running" })] });
    await guild.members.fetch();
    await botChan.send({
        embeds: [new Discord.MessageEmbed({ description: `Fetched all ${guild.members.cache.size} members` })]
    });
});

interactions.on("error", console.log);
// interactions.on("commandRegister", console.log);

client.on("message", async (msg: Discord.Message) => {
    if (!connection) return;

    const wasSlur = await SlurFilter(msg);
    if (wasSlur) return;

    AutoReact(msg);
    updateUserScore(msg, connection); // Add to score
});

client.on("messageReactionAdd", async (reaction, user) => {
    const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
    const fullUser = user.partial ? await user.fetch() : user;
    for (const reactionHandler of reactionHandlers) {
        // If a command's handler returns true, it handled the reaction; no need to continue
        const retVal = await reactionHandler({ reaction: fullReaction, user: fullUser, connection, interactions });
        if (retVal) return;
    }
});

client.on("interaction", (interaction) => {
    if (!interaction.isMessageComponent()) return;

    const id = interaction.customID;

    console.log(`[interaction] ${id}`);

    const interactionComponent = interactionHandlers.find((handler) => id.startsWith(handler.name));

    if (!interactionComponent) return;

    interactionComponent.handler(interaction, connection, interactionComponent.pattern.toDict(id));
});

function setup() {
    //LOAD FONTS
    const fonts = ["h", "f", "NotoEmoji-Regular", "a", "j", "c", "br"];
    for (const font of fonts) registerFont(`./src/assets/fonts/${font}.ttf`, { family: "futura" });

    registerFont(`./src/assets/fonts/FiraCode/Regular.ttf`, { family: "FiraCode" });

    Scheduler(client, connection);
}

async function dynamicCommandSetup(commands: Command[]): Promise<void> {
    const guild = await client.guilds.fetch(guildID);

    // Concert channels
    const concertManager = new ConcertChannelManager(guild);
    await concertManager.fetchConcerts();
    await concertManager.checkChannels();

    const concertsByCountry: Record<string, typeof concertManager["concertChannels"]> = {};

    for (const concert of concertManager.concertChannels) {
        const country =
            concert.concert?.venue?.country
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/[^\w-]/g, "")
                .substring(0, 32) || "other";
        if (!concertsByCountry[country]) concertsByCountry[country] = [];
        concertsByCountry[country].push(concert);
    }

    const rolesCommands = commands.find((c) => c.commandName === "roles");
    const command = rolesCommands?.options?.find((o) => o.name === "concert");
    if (!command || command.type !== CommandOptionType.SUB_COMMAND) {
        console.error("Couldn't find command");
        return;
    } else console.log(`Got command: ${command.description}`);

    command.options = [];
    for (const [countryName, allConcerts] of Object.entries(concertsByCountry)) {
        const subdivisions = R.splitEvery(25, allConcerts);
        for (let i = 0; i < subdivisions.length; i++) {
            const concerts = subdivisions[i];
            command.options.push({
                name: `${countryName}${i === 0 ? "" : i}`,
                description: `Select a concert in ${countryName}`,
                required: false,
                type: CommandOptionType.STRING,
                choices: concerts.map((c) => ({
                    name: c.concert.title || c.concert.venue.name,
                    value: c.channelID || ""
                }))
            });
        }
    }

    // console.log(command.options);
}

process.on("unhandledRejection", (err) => {
    console.log("unhandledRejection: ", err);
});
process.on("uncaughtException", (err) => {
    console.log("uncaughtException: ", err);
});
