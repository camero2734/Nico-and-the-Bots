module.exports = {
    execute: function (msg) {
        if (msg.content.indexOf('(') === -1 || msg.content.indexOf(')') === -1 || msg.content.indexOf(',') === -1) {
            return msg.channel.send(wrap('Proper command usage is !callvote vote text here (option1, option2...)'))
        }
        if (currentvote.length > 0) return msg.channel.send('```Vote already in progress!```')
        var cont = msg.content.substring(10)
        var cont2 = cont.split('(')
        //should we allow it (yes,no)
        var temp = cont2[1].replace(/\)/g, "")
        var temp2 = temp.replace(/, /g, ",")
        var options = temp2.split(',')
        var vote = { opt: options, words: cont2[0] }
        currentvote.push(vote)
        var string1 = "```md\n#" + msg.author.username + "'s vote: " + vote.words + '\n'
        var string = string1.replace(/ \)/, ")")
        var numero = 1
        for (let i = 0; i < vote.opt.length; i++) {
            votes.push({ choice: vote.opt[i], numvote: 0, author: msg.author.username })
            string += numero + ". " + vote.opt[i] + ' 0' + "\n"
            numero++
        }
        msg.channel.send(string + '```')
    },
    info: {
        aliases: false,
        example: "!callvote Do you like dolphins? (yes, no, maybe)",
        minarg: 2,
        description: "Creates a vote that other users can participate in. End with !endvote",
        category: "Voting",
    }
}