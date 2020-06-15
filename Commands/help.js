module.exports = {
    execute: function (msg) {
        let cP = msg.content.split(' ')

        let help_command = findCommand(cP[1], commands)

        if (help_command) {
            help_command.embed(msg)
        } else {
            msg.channel.send("`I couldn't find that command!`")
        }

    },
    info: {
        aliases: false,
        example: "!help [command name]",
        minarg: "2",
        description: "Displays info about a command",
        category: "Info",
    }
}