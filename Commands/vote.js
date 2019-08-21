module.exports = {
    execute: function (msg) {
        if (currentvote.length < 1) return msg.channel.send("```No current votes!```")
        var vote = currentvote[0]
        var args = msg.content.split(' ')
        if ((!args) || (!args[1])) return msg.channel.send(votefunc(votes, currentvote) + "```")
        var num = args[1]
        var parse = parseInt(num)
        if ((parse / parse !== 1) || (parseInt(num) < 1) || (parseInt(num) > vote.opt.length)) return msg.channel.send("```Proper command usage is !vote [option number]. Use !vote with no arguments to see current vote.```")
        if (voted.indexOf(msg.author.id) !== -1) return msg.channel.send('```You have already voted!```')
        votes[parse - 1].numvote++
        msg.channel.send('```Vote received! Use !vote to view # of votes!```')
        voted.push(msg.author.id)
    },
    info: {
        aliases: false,
        example: "!vote (option number) // Use !vote by itself to see current vote stats",
        minarg: 1,
        description: "Casts a vote in the current vote",
        category: "Voting",
    }
}