module.exports = {
    execute: function (msg) {
        leveltokens = JSON.parse(fs.readFileSync("./leveltokens.json", "utf8"));
        if (!leveltokens[msg.author.id] || !leveltokens[msg.author.id]['tokens'] || leveltokens[msg.author.id]['tokens'] === 0) return msg.channel.send('You don\'t have any LT! Earn them by leveling up!')
        msg.channel.send('You have ' + leveltokens[msg.author.id]['tokens'] + ' LT!')
        //
    },
    info: {
        aliases: ["mytokens","lt","checklt"],
        example: "!mytokens",
        minarg: 0,
        description: "Displays how many Level Tokens you have",
        category: "Basic",
    }
}