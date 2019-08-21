module.exports = {
    execute: async function (msg) {
        let userLT = await connection.getRepository(LevelToken).findOne({ id: msg.author.id });
        if (!userLT) userLT = new LevelToken(msg.author.id, 0, 0);
        return msg.channel.embed(`You have ${userLT.value} LT!`);
    },
    info: {
        aliases: ["mytokens", "lt", "checklt"],
        example: "!mytokens",
        minarg: 0,
        description: "Displays how many Level Tokens you have",
        category: "Basic"
    }
};