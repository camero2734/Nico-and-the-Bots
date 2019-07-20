module.exports = {
    execute: function (msg) {
        let toCheck = ["info", "basic", "fun", "staff", "other", "tags", "roles", "voting", "profile", "music", "blurrybox", "social", "teams"]
        let args = msg.content.split(' ')
        if (args && args[1]) {
            if (toCheck.indexOf(args[1].toLowerCase()) === -1) return msg.channel.send({ embed: new Discord.RichEmbed({ description: 'Invalid category!' }) })
            let embed = new Discord.RichEmbed({ title: args[1].toUpperCase() });
            let _i = 0;
            for (let command of commands) {
                if (command.category.toLowerCase() === args[1].toLowerCase() && _i++ < 25) embed.addField(command.name, command.description);
                
            }
            embed.setColor('#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6))
            embed.setFooter('Use **!help [command name]** for more info about a command')
            msg.channel.send({ embed: embed })
        }
        else {
            //Whole List
            let types = ["Info", "Basic", "Fun", "Staff", "Other", "Tags", "Roles", "Voting", "Profile", "Music", "Blurrybox", "Social", "Teams"]
            let embed = new Discord.RichEmbed({ title: "**Command Categories**" })
            let str = ''
            for (let type of types) {
                str += `• __**${type}**__\n`
            }
            embed.setColor('#' + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6))
            embed.setDescription(str + '\n Use **!commands [category]** to view commands')
            embed.setFooter('Total commands: ' + commands.length)
            msg.channel.send({ embed: embed })
        }

    },
    info: {
        aliases: ["commands","commandlist"],
        example: "!commands (subpage)",
        minarg: 0,
        description: "Returns a list of all commands",
        category: "Info",
    }
}