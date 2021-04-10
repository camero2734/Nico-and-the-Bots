import { prefix } from "configuration/config";
import { Command, CommandMessage } from "configuration/definitions";
import { Message, MessageEmbed } from "discord.js";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "pronoun",
    description: "Get a pronoun role",
    category: "Roles",
    usage: "!pronoun [pronoun]",
    example: "!pronoun they/them",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        //
    }
});
