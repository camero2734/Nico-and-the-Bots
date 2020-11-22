import * as Discord from "discord.js";
import * as config from "./configuration/config";
import { Command } from "./configuration/definitions";
import * as secrets from "./configuration/secrets.json";
import { CommandLoader } from "./helpers";

const commands: Command[] = [];

const client = new Discord.Client();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    CommandLoader(commands);
});

client.on("message", (msg) => {
    if (msg.content.startsWith(config.prefix)) {
        const commandName = msg.content.split(" ")[0].substring(config.prefix.length).toLowerCase();
        const command = commands.find((c) => c.name === commandName);
        if (!command) return msg.channel.send("I couldn't find that command!");

        command.execute(msg);
    }
});

client.login(secrets.tokens.nico);
