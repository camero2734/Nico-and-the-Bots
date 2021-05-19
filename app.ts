import { Command, CommandReactionHandler } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as Discord from "discord.js";
import * as helpers from "helpers";
import { updateUserScore } from "helpers";
import * as path from "path";
import { GatewayServer, SlashCreator } from "slash-create";
import { Connection } from "typeorm";

// let ready = false;
let connection: Connection;

const client = new Discord.Client({ fetchAllMembers: true });

const interactions = new SlashCreator({
    applicationID: "470410168186699788",
    token: secrets.bots.nico,
    defaultImageFormat: "png"
});

const reactionHandlers: CommandReactionHandler[] = [];

client.login(secrets.bots.nico);

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const commands: Command[] = [];

    // Initialize everything
    await Promise.all([
        // Wait until commands are loaded, connected to database, etc.
        helpers.loadCommands(commands, reactionHandlers, interactions),
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
        .syncCommands();

    // Set the database connection on each command
    const loadedCommands = (interactions.commands as unknown) as Discord.Collection<string, Command>;
    loadedCommands.forEach((c) => {
        c.setConnectionClient(connection, client);
    });

    console.log(`Bot initialized with ${loadedCommands.size} commands`);
});

interactions.on("error", console.log);
// interactions.on("commandRegister", console.log);

client.on("message", (msg: Discord.Message) => {
    if (!connection) return;

    updateUserScore(msg, connection); // Add to score
});

//Manually emit an event for reactions on messages sent before the bot was turned on
const reaction_events = <const>{
    MESSAGE_REACTION_ADD: "messageReactionAdd",
    MESSAGE_REACTION_REMOVE: "messageReactionRemove"
};
client.on("raw", async (event) => {
    try {
        // eslint-disable-next-line no-prototype-builtins
        if (reaction_events.hasOwnProperty(event.t)) {
            const eventT = event.t as keyof typeof reaction_events;
            const { d: data } = event;
            const user = await client.users.fetch(data.user_id);
            const channel = ((await client.channels.fetch(data.channel_id)) as Discord.TextChannel) || (await user.createDM()); // prettier-ignore
            if (channel.messages.cache.has(data.message_id)) return;
            const message = await channel.messages.fetch(data.message_id);
            const emojiKey = data.emoji.id ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
            const reaction = message.reactions.cache.get(emojiKey) as Discord.MessageReaction;
            client.emit(reaction_events[eventT], reaction, user);
        }
    } catch (e) {
        //
    }
});

client.on("messageReactionAdd", async (reaction, user) => {
    if (!reaction) return;

    const fullUser = user.partial ? await user.fetch() : user;
    for (const reactionHandler of reactionHandlers) {
        // If a command's handler returns true, it handled the reaction; no need to continue
        const retVal = await reactionHandler({ reaction, user: fullUser, connection });
        if (retVal) return;
    }
});
