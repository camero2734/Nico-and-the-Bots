module.exports = {
    execute: function (msg) {
        if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("You don't have permission to do this!")
        msg.channel.overwritePermissions('269660541738418176', { 'SEND_MESSAGES': false })
        msg.channel.send('```Lockdown started! Use the !stoplockdown stop command to end the lockdown.```')
        staffUsedCommand(msg, "Start Lockdown", "#b88e0b", {channel: msg.channel.toString(),time: (new Date()).toString()})
    },
    info: {
        aliases: false,
        example: "!startlockdown",
        minarg: 0,
        description: "Prevents users from talking in the current channel",
        category: "Staff",
    }
}