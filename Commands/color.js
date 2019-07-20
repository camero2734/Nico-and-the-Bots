module.exports = {
    execute: function (msg) {
        if ((!msg.member.roles.has('326558787169288203')) && (!msg.member.roles.has('326558918107070465')) && (!msg.member.roles.has('326558916219502595'))) return msg.channel.send("```You do not have the proper role```")
        var args = msg.content.split(/[ ]+/);
        if (!args) return msg.channel.send("```Proper command usage is !color [hex value]```")
        if (!args[1]) return msg.channel.send("```Proper command usage is !color [hex value]```")
        if (!args[1].startsWith('#')) return msg.channel.send("```Proper command usage is !color [hex value]```")
        if (msg.member.roles.has('326558787169288203')) {
            msg.member.roles.get('326558787169288203').setColor(args[1])
        } else if (msg.member.roles.has('326558918107070465')) {
            msg.member.roles.get('326558918107070465').setColor(args[1])
        } else if (msg.member.roles.has('326558916219502595')) {
            msg.member.roles.get('326558916219502595').setColor(args[1])
        } else return;
        msg.channel.send("```Your color has been changed!```")
    },
    info: {
        aliases: ["color","colour"],
        example: "!color [hex color]",
        minarg: 2,
        description: "Allows user to change role color if they have a top 3 of the month role",
        category: "Roles",
    }
}