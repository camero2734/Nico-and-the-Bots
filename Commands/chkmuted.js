module.exports = {
    execute: function (msg) {
        var timedout = msg.guild.roles.get(TO).members.array()
        var string = "Timed out users:\n\n"
        for (let i = 0; i < timedout.length; i++) {
            string += "User: " + timedout[i].user.username + "\n"
        }
        msg.channel.send(string, { code: "http" })
    },
    info: {
        aliases: ["chkmuted","chktimeout","chktimedout","ct"],
        example: "!chkmuted",
        minarg: 0,
        description: "Displays a list of members with the muted role",
        category: "Staff",
    }
}