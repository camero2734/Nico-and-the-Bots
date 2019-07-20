module.exports = {
    execute: function (msg) {
        var alreadyHasRole = true
        if (!msg.member.roles.get('428015106904031243')) {
            alreadyHasRole = false
        }
        if (alreadyHasRole) {
            msg.member.removeRole('428015106904031243')
            msg.channel.send(('You\'ve been removed from the leak squad. >:('))
            return
        }
        if (!alreadyHasRole) {
            msg.member.addRole('428015106904031243')
            msg.channel.send(('You joined the leak squad >:)'))
            return
        }
    },
    info: {
        aliases: false,
        example: "!leaksquad",
        minarg: 0,
        description: "Gives you a pingable role for important leaks",
        category: "Roles",
    }
}