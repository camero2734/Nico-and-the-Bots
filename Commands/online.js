module.exports = {
    execute: function (msg) {
        var j = 0
        var k = 0
        var array = msg.guild.members.array()
        for (let i = 0; i < array.length; i++) {
            if (array[i].presence.status === 'online') j++
            if (array[i].presence.status === 'idle') k++
        }
        msg.channel.send('`There are ' + j + ' members online and ' + k + ' members idle!`')
    },
    info: {
        aliases: false,
        example: "!online",
        minarg: 0,
        description: "Displays the current online/idle/offline numbers of the server",
        category: "Other",
    }
}