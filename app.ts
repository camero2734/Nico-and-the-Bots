import { Command, CommandComponentListener, CommandReactionHandler } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as Discord from "discord.js";
import * as helpers from "helpers";
import { updateUserScore } from "helpers";
import { GatewayServer, SlashCreator } from "slash-create";
import { Connection } from "typeorm";
import { KeonsBot } from "./shop";

// let ready = false;
let connection: Connection;

const client = new Discord.Client({ intents: Discord.Intents.ALL, partials: ["REACTION", "USER", "MESSAGE"] });
const keonsBot = new KeonsBot();

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

    keonsBot.setupShop();

    console.log(`Bot initialized with ${loadedCommands.size} commands`);
});

interactions.on("error", console.log);
// interactions.on("commandRegister", console.log);

client.on("message", (msg: Discord.Message) => {
    if (!connection) return;

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

    const interactionComponent = interactionHandlers.find((handler) => id.startsWith(handler.name));

    if (!interactionComponent) return;

    interactionComponent.handler(interaction, connection, interactionComponent.pattern.toDict(id));
});

process.on("unhandledRejection", (err) => {
    console.log("unhandledRejection: ", err);
});
process.on("uncaughtException", (err) => {
    console.log("uncaughtException: ", err);
});
