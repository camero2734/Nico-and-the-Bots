import * as Discord from "discord.js";
import * as config from "configuration/config";
import { Command } from "configuration/definitions";
import * as secrets from "configuration/secrets.json";
import * as helpers from "helpers";
import { Connection } from "typeorm";

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

client.on("message", (msg) => {
    if (!ready) return;

    if (msg.content.startsWith(config.prefix)) {
        Command.runCommand(msg, connection).catch(() => {
            msg.channel.send("I couldn't find that command!");
        });
    }
});

client.on("messageReactionAdd", async (reaction, u) => {
    // Only care about user's reactions on bot's messages
    const msg = reaction.message;
    if (!msg.author.bot || u.bot) return;

    const user = await u.fetch();

    for (const c of commands) {
        if (c.interactiveFilter && c.interactiveHandler) {
            const passes = await c.interactiveFilter(msg, reaction, user);
            if (passes) await c.interactiveHandler(msg, connection, reaction, user).catch(console.log);
            return;
        }
    }
});

client.login(secrets.bots.nico);
