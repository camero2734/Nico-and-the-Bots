module.exports = {

    execute: async function (msg) {
        let input = removeCommand(msg.content);
        let length = 10;
        if (!isNaN(input) && input > 0) length = input;

        if (msg.author.id !== poot) length = Math.min(length, 50);

        let string = "";
        for (let i = 0; i < length; i++) {
            let letters = "abcdefghijklmnopqrstuvwxyz".split("");
            string+=letters[Math.floor(Math.random() * letters.length)];
        }
        msg.channel.embed(string);
    },

    info: {
        aliases: false,
        example: "!keysmash (length)",
        minarg: 1,
        description: "Gives a random keyboard smash of provided length. Defaults to 10.",
        category: "Fun",
    }
}
