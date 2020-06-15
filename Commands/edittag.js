module.exports = {
    execute: async function(msg) {
        if (msg.content.indexOf('@') !== -1) return msg.channel.send(wrap("Please do not use '@' in tags!"))
        if (msg.content.length >= 1000) return msg.channel.send(wrap('Tags must be less than 1000 characters!'))
        tags = await loadJsonFile('json/tags.json')
        let tagname = msg.args[1]
        tagname = tagname.replace(/ /g, "")
        if (!tags[tagname]) return msg.channel.embed('`Tag not found!`')
        if (tags[tagname].user !== msg.author.id && msg.author.id !== '221465443297263618') return msg.channel.embed('`You did not make this tag, so you cannot delete it!`')
        if (tags[tagname]) {
            tags[tagname].tag = removeCommand(removeCommand(msg.content))
            writeJsonFile('json/tags.json', tags)
            msg.channel.embed('Your tag, `' + tagname + '`, has been edited to say `' + tags[tagname].tag +'`')
        }
    },
    info: {
        aliases: false,
        example: "!edittag [tagname] [tag content]",
        minarg: 3,
        description: "Edits a tag that you own",
        category: "Tags",
    }
}