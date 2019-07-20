module.exports = {
    execute: function (msg) {
        let id = msg.author.id
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) { let m = msg.mentions.users.first(); id = m.id; }
        let tagString = '__User tags__\n\n'
        for (let tname in tags) {
            let tag = tags[tname]
            if (tag.user === id) tagString += '**' + tname + '** [' + tag.num + ']\n'
        }
        msg.channel.send(tagString)
    },
    info: {
        aliases: ["usertags","mytags"],
        example: "!usertags (@ user)",
        minarg: 0,
        description: "Displays all of a users' tags",
        category: "Tags",
    }
}