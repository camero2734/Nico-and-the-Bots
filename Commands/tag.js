module.exports = {
    execute: function (msg) {
        let allowedChans = [chans.offtopic, chans.trench, chans.slowtown, chans.commands, chans.laxstaff, chans.staff, chans.verifiedtheories, chans.fairlylocals]
        if (allowedChans.indexOf(msg.channel.id) === -1 && !msg.member.roles.get('330877657132564480')) {
            msg.channel.send(`**Please use commands in** <#${chans.commands}>!`).then((m) => {
                m.delete(3000)
            })
            msg.delete(1000)
            return;
        }
        var args = msg.content.split(' ')
        if (!args || !args[1]) return msg.channel.send(wrap('Proper command usage is !tag [tag name]'))
        var tagname = args[1]
        if (tags[tagname] && tags[tagname].tag) {
            msg.channel.send(tags[tagname].tag)
            tags[tagname].num++
            writeJsonFile("json/tags.json", tags)
        }
        if (!tags[tagname]) {
            return msg.channel.send(wrap('Tag does not exist!'))
        }
    },
    info: {
        aliases: false,
        example: "!tag [tag name]",
        minarg: 2,
        description: "Uses a tag created with !createtag",
        category: "Tags",
    }
}