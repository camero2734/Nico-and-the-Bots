module.exports = {
    execute: async function (msg, args) {
        if (!args[1]) return msg.channel.embed("You must provide a username")
        let sessionID = '5650751225%3AhNFxDnkACDUxLh%3A12'
        let stories = require('./node_modules/stories/index.js')
        stories(args[1], sessionID).then((urls) => {
            if (urls.length === 0) return msg.channel.embed(args[1] + ' has no current IG stories')
            if (!args[2]) return msg.channel.embed(args[1] + ' has ' + urls.length + ' current stories. Use `!igstory [username] [story #]` to view one.')
            args[2]--
            if (args[2] < 0 || !urls[args[2]]) return msg.channel.embed("Invalid story number. " + args[1] + ' has ' + urls.length + ' current stories.')
            return msg.channel.send(urls[args[2]])
        }).catch((e) => msg.channel.embed(e.toString()))
    },
    info: {
        aliases: false,
        example: "!getIG",
        minarg: 2,
        description: "Gets latest IG story posts from a user",
        category: "Social",
    }
}