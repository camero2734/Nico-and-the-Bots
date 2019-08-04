module.exports = {
    execute: function (msg) {
        return msg.channel.send(msg.author.id);
    },
    info: {
        aliases: false,
        example: "!myid",
        minarg: 0,
        description: "Sends your ID",
        category: "Other",
    }
}