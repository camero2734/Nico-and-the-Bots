module.exports = {
    execute: function (msg) {
        var amount = 1000
        let content = msg.content.replace('  ', ' ')
        var args = content.split(' ')
        if (msg.content.indexOf('@') !== -1) return msg.channel.send(wrap("Please do not use '@' in tags!"))
        if (msg.content.length >= 1000) return msg.channel.send(wrap('Tags must be less than 1000 characters!'))
        sql.get(`SELECT * FROM daily WHERE userId ="${msg.author.id}"`).then(row => {
            var able = row.xp
            if (able < amount) return msg.channel.send('Not enough credits!')
            var tagname = args[1]
            if (tags[tagname]) return msg.channel.send('Tag already exists!')
            // var numOfTags = 0
            // for (let key in tags) {
            //     if (tags.hasOwnProperty(key)) {
            //         let object = tags[key]
            //         let user = object.user
            //         if (user === msg.author.id) {
            //             numOfTags++
            //         }
            //     }
            // }
            // if (numOfTags >= 10) return msg.channel.send(wrap('You already have 10 tags! If you wish to buy another one, please use !removetag [one of your tags]'))
            args.shift()
            args.shift()
            var toTag = args.join(' ')
            msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to purchase the tag `" + tagname + "` that says `" + toTag + "` for " + amount + " credits?"}).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL) }).then((m2) => {
                const filter = (m => m.author.id === msg.author.id)
                msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                    .then(collected => {
                        m2.delete()
                        let answer = collected.first()
                        answer.delete();
                        if (answer.content.toLowerCase() === "no" || answer.content === "") {
                            return msg.channel.embed("Tag creation was cancelled.")
                        } else if (answer.content.toLowerCase() === "yes") {
                            myFunctions.credits(msg, -amount)
                            tags[tagname] = {}
                            tags[tagname].tag = toTag
                            tags[tagname].num = 0
                            tags[tagname].user = msg.author.id
                            writeJsonFile('tags.json', tags)
                            msg.channel.embed('New tag created...\nName: ' + tagname + '\nTag: ' + toTag)
                        }
                        else return msg.channel.embed("Because you replied with something other than 'yes' or 'no', your tag creation was cancelled.")
                    })
                    .catch(collected => {
                        return msg.channel.embed("Tag creation was cancelled.")
                    });
            })
        })
    },
    info: {
        aliases: false,
        example: "!createtag [tagname] [tag text]",
        minarg: 3,
        description: "Creates a tag to use via !tag [tag name]",
        category: "Tags",
    }
}