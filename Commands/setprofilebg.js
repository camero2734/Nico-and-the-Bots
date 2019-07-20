module.exports = {
    execute: function (msg, args) {
        let rip = msg.content.toLowerCase()

        if (msg.attachments.size !== 0) {
            let attachments = msg.attachments.array()
            if (attachments.length > 0) { downloadFromLink(attachments[0].url) } else { downloadFromLink(args[1]) }
        } else {
            if (rip.indexOf('http') === -1 || (!rip.endsWith('.png') && (!rip.endsWith('.jpg')))) return msg.channel.send('`Please link to a picture direct website link beginning with "http" and ending with ".png" or ".jpg". If you are confused, please ask poot, the staff, or one who consumes death.`')
            downloadFromLink(msg.removeCommand(msg.content))
        }
        function downloadFromLink(link) {
            snekfetch.get(link).then((r) => {
                fs.writeFile("./profilebgs/" + msg.author.id + ".png", r.body, (err) => {
                    if (err) return console.error(err)
                    msg.channel.send('`You successfully changed your background!`')
                })
            }).catch(err => msg.channel.send({ embed: new Discord.RichEmbed({ description: err.toString() }) }))
        }

    },
    info: {
        aliases: ["setprofilebg","pbg"],
        example: "!setprofilebg [https://linktosomepic.png] OR !setprofilebg [UPLOAD]",
        minarg: 1,
        description: "Changes the background of your !profile. You must provide a direct link to the image file or upload a file",
        category: "Profile",
    }
}