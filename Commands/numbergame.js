module.exports = {
    execute: function (msg) {
        let game;
        let guess = msg.removeCommand(msg.content)
        let args = msg.content.split(' ');
        for (let gameF of numberGames) { if (gameF.id === msg.author.id) { game = gameF; } }
        (args.length > 1) ? playGame() : initiateGame(false)

        function playGame() {
            if (typeof game === 'undefined' || typeof game.sum === 'undefined') return initiateGame(true)
            if (guess < 1 || guess > 10 || guess / guess !== 1) return msg.channel.send("`Number must be between 1 and 10`")
            let curSum = game.sum
            let newSum = curSum + parseInt(guess)
            msg.channel.send(embed('`New sum for ' + msg.member.displayName + ' is ' + newSum + '. Choosing a number...`')).then(() => {
                let botNum = 11 - guess
                let finalSum = newSum + botNum
                setTimeout(() => {
                    if (finalSum === 100) return msg.channel.send(embed('`For ' + msg.member.displayName + '\'s game I choose ' + botNum + '. The new total is ' + finalSum + '. I win.`')).then(() => { for (let i = 0; i < numberGames.length; i++) { if (numberGames[i].id === msg.author.id) { numberGames.splice(i, 1) } } })
                    msg.channel.send(embed('`For ' + msg.member.displayName + '\'s game I choose ' + botNum + '. The new total is ' + finalSum + '. Choose a number.`'))
                    for (let i = 0; i < numberGames.length; i++) {
                        if (numberGames[i].id === msg.author.id) {
                            numberGames[i] = { id: msg.author.id, sum: finalSum }
                            return;
                        }
                    }
                }, 400)
            })
        }
        function initiateGame(hasGuess) {
            for (let gameF of numberGames) if (gameF.id === msg.author.id) return msg.channel.send("`Number must be between 1 and 10`")
            msg.channel.send(embed('`You began a game! The current sum is 1. Please make your first guess with !ng [number 1-10]`'))
            numberGames.push({ id: msg.author.id, sum: 1 })
        }


    },
    info: {
        aliases: ["numbergame","ng"],
        example: "!ng 8",
        minarg: 0,
        description: "Take turns choosing numbers [1-10] w/ the bot. First one to 100 wins!",
        category: "Fun",
    }
}