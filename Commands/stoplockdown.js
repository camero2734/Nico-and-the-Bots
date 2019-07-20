module.exports = {
    execute: function (msg) {
        if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("You don't have permission to do this!")
        msg.channel.overwritePermissions('269660541738418176', { 'SEND_MESSAGES': true })
        msg.channel.send('```Lockdown stopped!```')
        staffUsedCommand(msg, "Stop Lockdown", "#2f9d66", {channel: msg.channel.toString(),time: (new Date()).toString()})
    },
    info: {
        aliases: ["stoplockdown","endlockdown"],
        example: "!stoplockdown",
        minarg: 0,
        description: "Allows users to talk in the current channel",
        category: "Staff",
    }
}