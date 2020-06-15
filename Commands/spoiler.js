module.exports = {
    execute: async function (msg) {
        let images = undefined
        let ending = undefined
        if (msg.attachments.size !== 0) {
            let image = (await snekfetch.get(msg.attachments.first().url))
            let buffer = new Buffer.from(image.body)
            let endingArr = msg.attachments.first().url.split(".")
            ending = endingArr[endingArr.length - 1]
            let m = await msg.guild.channels.get(chans.spoilerimages).send(new Discord.Attachment(buffer, "spoiler." + ending))
            if (m && m.attachments && m.attachments.size !== 0 && m.attachments.first() && m.attachments.first().url) images = m.attachments.first().url
        }
        msg.delete()
        msg.content = msg.removeCommand(msg.content)
        if ((!msg.attachments && msg.content === "") || (msg.attachments.size === 0 && msg.content === "")) return this.embed()
        let spoilers = await loadJsonFile('json/spoilers.json')
        spoilers[msg.id] = { images: images, text: (msg.content ? msg.content : "") }
        await writeJsonFile('json/spoilers.json', spoilers)
        let description = "Spoiler from " + msg.member.displayName
        msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", enter a description. If you do not want to add a description, say \"No\"" }).setColor("RANDOM").setFooter("You have a minute to enter a description", bot.user.displayAvatarURL) }).then((m2) => {
            const filter = (m => {
                if (m.author.id !== msg.author.id) return false;
                if (m.channel.id === chans.leakstheories && m.content.toLowerCase() === 'no') {
                    m.channel.embed("In this channel you must add a description. This can be something as simple as 'lyrics to x', 'about x song', 'theory about the plot in x'.")
                    return false;
                } else return true;

            })
            let embed = new Discord.RichEmbed().setTitle("Spoiler from " + msg.member.displayName).setColor("RANDOM").setDescription("Text: " + (msg.content === "" ? "No" : "Yes") + ", File: " + (images ? ending.toUpperCase() : "No")).setFooter(msg.id)
            msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    m2.delete()
                    let answer = collected.first()
                    answer.delete()
                    if (answer.content.toLowerCase() === "no" || answer.content === "") msg.channel.send({ embed: embed }).then((m) => { m.react("👀") })
                    else msg.channel.send({ embed: embed.addField("Description:", answer.content) }).then((m) => { m.react("👀") })
                })
                .catch(collected => {
                    msg.channel.send({ embed: embed }).then((m) => { m.react("👀") })
                });
        })
    },
    info: {
        aliases: false,
        example: "!spoiler everyone dies in Trench",
        minarg: 0,
        description: "Creates a message that, when reacted to, will send the contents of a spoiler",
        category: "Basic",
    }
}
