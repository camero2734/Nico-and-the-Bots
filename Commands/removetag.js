module.exports = {
    execute: async function (msg) {
        tags = await loadJsonFile("tags.json")
        let tagname = msg.removeCommand(msg.content)
        tagname = tagname.replace(/ /g, "")
        if (!tags[tagname]) return msg.channel.embed('`Tag not found!`')
        if (tags[tagname].user !== msg.author.id && msg.author.id !== '221465443297263618') return msg.channel.embed('`You did not make this tag, so you cannot delete it!`')
        if (tags[tagname]) {
            delete tags[tagname]
            writeJsonFile('tags.json', tags)
            msg.channel.send('`Your tag has been removed!`')
        }
    },
    info: {
        aliases: ["removetag","deletetag"],
        example: "!removetag [tag name]",
        minarg: 2,
        description: "Remove a tag you have created",
        category: "Tags",
    }
}