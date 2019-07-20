module.exports = {
    execute: function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;
        let appealChan = msg.guild.channels.get(chans.appeals)
        let after = "470456932046602251"
        let links = "**Unreacted appeals**\n"
        let num = 0
        let total = 0
        let checked = []
        fetchMsgs(after)
        function fetchMsgs(afterM) {
            appealChan.fetchMessages({ after: afterM, limit: 100 }).then((msgsC) => {
                let msgs = msgsC.array()
                if (msgs.length === 0) return msg.channel.send(links + '\n' + total + ' total appeals', { split: true })
                let lastID = msgs[0].id
                for (let message of msgs) {
                    if (checked.indexOf(message.id) === -1 && (message && message.embeds && message.embeds[0] && message.embeds[0].fields && message.embeds[0].fields[0] && message.embeds[0].fields[0].value.startsWith("❓"))) {
                        checked.push(message.id)
                        total++
                        if (message.reactions.size === 0 && num < 10) {
                            num++
                            links += `https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}` + '\n'
                        }
                    }

                }
                fetchMsgs(lastID)
            })
        }

    },
    info: {
        aliases: false,
        example: "!getappeals",
        minarg: 0,
        description: "Reveals appeals that haven't been reacted to",
        category: "Staff",
    }
}