import { prefix } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";

export default new Command({
    name: "help",
    description: `Sends an overview for a command. To view available commands, use the \`${prefix}commands\` command`,
    category: "Info",
    usage: "!help [command name]",
    example: "!help score",
    async cmd(msg: CommandMessage): Promise<void> {
        const name = msg.args[0];
        if (!name) throw new CommandError("No name provided");
        const command = Command.findCommandFromName(name);

        if (!command) throw new CommandError(`Could not find the \`${name}\` command`);
        command.sendHelp(msg.channel);
    }
});
