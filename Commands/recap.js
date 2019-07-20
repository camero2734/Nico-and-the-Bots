module.exports = {
    execute: function (msg) {
        if (msg.member.roles.get('402948433301733378')) {
            msg.member.removeRole('402948433301733378')
            msg.channel.send('`You will no longer get a daily recap!`')
        } else {
            msg.member.addRole('402948433301733378')
            msg.channel.send('`You will now get a daily recap!`')
        }
    },
    info: {
        aliases: false,
        example: "!recap",
        minarg: 0,
        description: "Turns on/off daily recap",
        category: "Other",
    }
}