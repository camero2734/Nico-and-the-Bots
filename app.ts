import * as Discord from "discord.js";
import * as config from "configuration/config";
import { Command, CommandMessage, InteractiveError } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as helpers from "helpers";
import { Connection } from "typeorm";
import { MessageReaction } from "discord.js";
import { User } from "discord.js";
import { PartialUser } from "discord.js";
import { Client } from "discord.js";
import { Message } from "discord.js";

let ready = false;
const commands: Command[] = [];
let connection: Connection;

const client = new Discord.Client({ fetchAllMembers: true });

client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    // Initialize everything
    await Promise.all([
        // Wait until commands are loaded, connected to database, etc.
        helpers.loadCommands(commands),
        new Promise((resolve) => {
            helpers.connectToDatabase().then((c) => {
                connection = c;
                resolve(true);
            });
        })
    ]);

    ready = true;

    console.log("Bot initialized");
});

client.on("message", (msg: Message) => {
    if (!ready || !(msg instanceof CommandMessage)) return;

    if (msg.content.startsWith(config.prefix)) {
        Command.runCommand(msg, connection).catch((e) => {
            console.log(e);
            msg.channel.send("I couldn't find that command!");
        });
    }
});

async function handleReactions(data: MessageReaction, u: User | PartialUser, added: boolean) {
    // Only care about user's reactions on bot's messages
    const msg = data.message as CommandMessage;
    if (!msg.author.bot || u.bot) return;

    const user = await u.fetch();

    console.log("Got reaction");

    for (const c of commands) {
        if (c.interactive) {
            console.log(`\tTrying ${c.name}`);
            try {
                await c.interactive(msg, connection, { data, user, added });
                return; // This one worked, no need to try any more
            } catch (e) {
                if (!(e instanceof InteractiveError)) {
                    console.log(e);
                    return; // Some uncaught error, don't try any more
                }
            }
        }
    }
}

client.on("messageReactionAdd", async (data, u) => handleReactions(data, u, true));
client.on("messageReactionRemove", async (data, u) => handleReactions(data, u, true));

client.login(secrets.bots.nico);
