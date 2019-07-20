module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed('no.')
        let leveltokens = await loadJsonFile('leveltokens.json')
        leveltokens[msg.author.id]['tokens'] = leveltokens[msg.author.id]['tokens'] + 1000
        writeJsonFile('leveltokens.json', leveltokens)
    },
    info: {
        aliases: false,
        example: "!givememoar",
        minarg: 0,
        description: "Gives POOT a large number of LT",
        category: "Staff",
    }
}