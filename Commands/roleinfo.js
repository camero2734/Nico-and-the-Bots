module.exports = {
    execute: function (msg) {
        var array = msg.content.split(" ")
        array.shift()
        var string = array.join(" ")
        var roles = msg.guild.roles.array()
        var found = false
        for (let i = 0; i < roles.length; i++) {
            var role = roles[i]
            var temp = role.name.replace(/ø/g, "o")
            var rolename = temp.replace(/Ø/g, "O")
            if (rolename.toLowerCase().startsWith(string.toLowerCase())) {
                var time = role.createdTimestamp
                var timenow = Date.now()
                var diff = (timenow - time) / 1000
                var days = Math.floor(diff / 86400)
                var hoisted = "No"
                if (role.hoist) {
                    hoisted = 'Yes'
                }
                let embed = new Discord.RichEmbed()
                embed.setTitle(role.name)
                embed.addField('Role ID:', role.id)
                embed.addField('# of members w/ role:', role.members.array().length)
                embed.addField('Creation date:', role.createdAt.toString())
                embed.addField('Hoisted?', hoisted)
                embed.addField('Hex Color Code:', role.hexColor)
                embed.setColor(role.hexColor)
                msg.channel.send({ embed: embed })
                found = true
            }
        }
        if (!found) return msg.channel.send("Role was not found!")
    },
    info: {
        aliases: false,
        example: "!roleinfo [role name]",
        minarg: 2,
        description: "Displays info about a role",
        category: "Roles",
    }
}
