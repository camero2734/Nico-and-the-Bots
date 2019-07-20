module.exports = function (votes, currentvote) {
    var vote = currentvote[0]
    var string1 = "```md\n#" + votes[0].author + "'s vote: " + vote.words + '\n'
    var string = string1.replace(/ \)/, ")")
    var numero = 1
    for (let i = 0; i < vote.opt.length; i++) {
        votes.push({ choice: vote.opt[i], numvote: 0 })
        string += numero + ". " + vote.opt[i] + ' ' + votes[i].numvote.toString() + "\n"
        numero++
    }
    return string;
}