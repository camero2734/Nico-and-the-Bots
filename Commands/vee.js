module.exports = {
    execute: async function (msg) {
        var string = "bcdfghjklmnpstwyz";
        var array = string.split("");
        array.push("reee");
        var random = Math.floor(Math.random() * array.length);
        var pick = array[random];
        return msg.channel.embed(pick + "ee!");
    },
    info: {
        aliases: false,
        example: "!vee",
        minarg: 0,
        description: "Returns a string that rhymes with vee",
        category: "Fun",
    }
}