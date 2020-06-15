module.exports = {
    execute: function (msg) {
        if (!msg.mentions.users) return;
        if (!msg.mentions.users.first()) return;
        if (msg.mentions.users.first().id === msg.author.id) {
            msg.channel.send("You can't give yourself a cookie")
            return
        }
        var args = msg.content.split(/[ ]+/);
        // args[1] is tha recipient
        if (!args[1]) return msg.channel.send("The correct usage is: !cookie [@user]")
        if (!cookie[msg.mentions.users.first().id]) cookie[msg.mentions.users.first().id] = {
            cookie: 0
        }
        cookie[msg.mentions.users.first().id].cookie++
        msg.channel.send(":cookie: | " + msg.author.username + " has given " + msg.mentions.users.first() + " a cookie")
        fs.writeFile("./json/cookies.json", JSON.stringify(cookie), (err) => {
            if (err) console.error(err)
        })
    },
    info: {
        aliases: false,
        example: "!cookie [@ user]",
        minarg: 2,
        description: "Give another user a gift of a cookie!",
        category: "Fun",
    }
}
