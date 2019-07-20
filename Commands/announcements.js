module.exports = {
    execute: function (msg) {
        var alreadyHasRole = true
        if (!msg.member.roles.get('357682068785856514')) {
            alreadyHasRole = false
        }
        if (alreadyHasRole) {
            msg.member.removeRole('357682068785856514')
            msg.channel.send(wrap('You no longer are being notified of announcements!'))
            return
        }
        if (!alreadyHasRole) {
            msg.member.addRole('357682068785856514')
            msg.channel.send(wrap('You will now be tagged in all #announcements posts!'))
            return
        }
    },
    info: {
        aliases: false,
        example: "!announcements",
        minarg: 0,
        description: "Turns on/off pings for the announcements role",
        category: "Roles",
    }
}