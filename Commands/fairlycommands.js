module.exports = {
    execute: function (msg) {
        if (!msg.member.roles.get('330877657132564480')) return msg.channel.send('`You have to be an admin or moderator to use this!`')
        var role = msg.guild.roles.get('283272728084086784')
        if (fairlycankick) {
            fairlycankick = false
            role.setPermissions([])
            msg.channel.embed('`Fairly Locals can no longer use !kick, !mute, !unmute, or manage messages`')
            return;
        }
        if (!fairlycankick) {
            fairlycankick = true
            role.setPermissions(['MANAGE_MESSAGES'])
            msg.channel.embed('`Fairly Locals can now use !kick, !mute, !unmute and can manage messages`')
            return;
        }
        return;
    },
    info: {
        aliases: false,
        example: "!fairlycommands",
        minarg: 0,
        description: "Allows FLs to use moderation commands",
        category: "Staff",
    }
}