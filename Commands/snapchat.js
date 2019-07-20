module.exports = {
    execute: function (msg, args) {
        let snapName = args[1]
        let snapchat = require('snapchat-stories')
        snapchat.getSnaps(snapName).then((info) => {
            let embed = new Discord.RichEmbed()
            embed.setTitle(info.id + ` (${info.user})`)
            embed.setColor('RANDOM')
            if (info.snaps.length < 1) {
                (async function () {
                    let image = (await snapchat.getSnapcode(snapName)).png
                    embed.attachFile({ attachment: image, name: snapName + '.png' })
                    embed.setImage("attachment://" + snapName + '.png')
                    embed.setDescription(info.id + ' has no available snaps')
                    msg.channel.send({ embed: embed })
                })()
            } else {
                if (args[2] && Number.isFinite(parseInt(args[2])) && parseInt(args[2]) > 0) {
                    args[2] = args[2] - 1
                    if (info.snaps[args[2]] && typeof info.snaps[args[2]] === 'string') {
                        snekfetch.get(info.snaps[args[2]]).then((r) => {
                            let ending = info.snaps[args[2]].split('.')
                            msg.channel.send(new Discord.Attachment(r.body, info.id + '_' + args[2] + '.' + ending[ending.length - 1]))
                        })
                    } else {
                        (async function () {
                            let image = (await snapchat.getSnapcode(snapName)).png
                            embed.attachFile({ attachment: image, name: snapName + '.png' })
                            embed.setImage("attachment://" + snapName + '.png')
                            embed.setDescription("Invalid page number. " + info.id + ' has ' + info.snaps.length + ' stories.')
                            msg.channel.send({ embed: embed })
                        })()

                    }
                } else {
                    (async function () {
                        let image = (await snapchat.getSnapcode(snapName)).png
                        embed.attachFile({ attachment: image, name: snapName + '.png' })
                        embed.setImage("attachment://" + snapName + '.png')
                        embed.setDescription(info.id + ' has ' + info.snaps.length + ' stories. Use `!snapchat [username] (story number)` to view one.')
                        msg.channel.send({ embed: embed })
                    })()
                }
            }
        }).catch(e => {
            (async function () {
                let embed = new Discord.RichEmbed()
                embed.setColor('RANDOM')
                let image = (await snapchat.getSnapcode(snapName)).png
                embed.attachFile({ attachment: image, name: snapName + '.png' })
                embed.setImage("attachment://" + snapName + '.png')
                embed.setDescription("Cannot access this user's snaps.")
                msg.channel.send({ embed: embed })
            })()
        })
    },
    info: {
        aliases: false,
        example: "!snapchat",
        minarg: 0,
        description: "Sends all snapchat stories from user",
        category: "Social",
    }
}