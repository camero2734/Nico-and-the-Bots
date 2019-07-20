module.exports = {
    execute: function (msg) {
        if (msg.author.id !== poot) return
        let roles = msg.guild.roles.array()
        let toSend = "Roles\n\n"
        let ordered = []
        for (let role of roles) {
            ordered[role.position] = role
        }
        ordered.reverse()
        for (let role of ordered) {
            toSend += role.id + ' || ' + role.position + '\n'
        }
        msg.channel.send(toSend, { split: true })
    },
    info: {
        aliases: false,
        example: "!getallroles",
        minarg: 0,
        description: "Gets all roles w/ names",
        category: "N/A",
    }
}