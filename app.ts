import { Command } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as Discord from "discord.js";
import * as helpers from "helpers";
import * as path from "path";
import { GatewayServer, SlashCreator } from "slash-create";
import { Connection } from "typeorm";



// let ready = false;
let connection: Connection;

const client = new Discord.Client({ fetchAllMembers: true });

const interactions = new SlashCreator({
    applicationID: "470410168186699788",
    token: secrets.bots.nico
});

client.login(secrets.bots.nico);

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const commands: Command[] = [];

    // Initialize everything
    await Promise.all([
        // Wait until commands are loaded, connected to database, etc.
        helpers.loadCommands(commands, interactions),
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
    const loadedCommands = interactions.commands as Discord.Collection<string, Command>;
    loadedCommands.forEach((c) => {
        c.setConnectionClient(connection, client);
    });

    console.log(`Bot initialized with ${loadedCommands.size} commands`);
});

interactions.on("error", console.log);
// interactions.on("commandRegister", console.log);

// client.on("message", (msg: Message) => {
//     if (!ready || !(msg instanceof CommandMessage)) return;

//     if (msg.content.startsWith(config.prefix)) {
//         Command.runCommand(msg, connection).catch((e) => {
//             console.log(e);
//             msg.channel.send("I couldn't find that command!");
//         });
//     }
// });

// async function handleReactions(data: MessageReaction, u: User | PartialUser, added: boolean) {
//     // Only care about user's reactions on bot's messages
//     const msg = data.message as CommandMessage;
//     if (!msg.author.bot || u.bot) return;

//     const user = await u.fetch();

//     console.log("Got reaction");

//     for (const c of commands) {
//         if (c.interactive) {
//             console.log(`\tTrying ${c.name}`);
//             try {
//                 await c.interactive(msg, connection, { data, user, added });
//                 return; // This one worked, no need to try any more
//             } catch (e) {
//                 if (!(e instanceof InteractiveError)) {
//                     console.log(e);
//                     return; // Some uncaught error, don't try any more
//                 }
//             }
//         }
//     }
// }

// client.on("messageReactionAdd", async (data, u) => handleReactions(data, u, true));
// client.on("messageReactionRemove", async (data, u) => handleReactions(data, u, true));


