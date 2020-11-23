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
        //
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
    // Wait until commands are loaded, connected to database, etc.
    if (!ready) return;

    if (msg.content.startsWith(config.prefix)) {
        const commandName = msg.content.split(" ")[0].substring(config.prefix.length).toLowerCase();
        const command = commands.find((c) => c.name === commandName);
        if (!command) return msg.channel.send("I couldn't find that command!");

        command.execute(msg, connection);
    }
});

client.login(secrets.tokens.nico);
