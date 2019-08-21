module.exports = {
    execute: function (msg) {
        if (!votes[0]) return;
        if (msg.author.username !== votes[0].author && msg.author.id !== poot) return msg.channel.send('```You didn\'t start the vote so you can\'t end it!```')
        if (currentvote.length < 1) return msg.channel.send("```No current votes!```")
        msg.channel.send('FINAL VOTES: \n' + votefunc(votes, currentvote) + '```')
        currentvote = []
        votes = []
        voted = []
    },
    info: {
        aliases: false,
        example: "!endvote",
        minarg: 0,
        description: "Ends the current vote if you started it",
        category: "Voting",
    }
}