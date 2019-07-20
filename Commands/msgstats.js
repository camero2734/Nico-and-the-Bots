module.exports = {
    execute: function (msg) {
        if (!fs.existsSync('msgcount.json')) return;
        fs.readFile('msgcount.json', function read(err, data) {
            let content = JSON.parse(data)
            sendMsgStats(content, msg).then((buffer) => msg.channel.send({ file: buffer }))
        });
    },
    info: {
        aliases: false,
        example: "!msgstats",
        minarg: 0,
        description: "Displays today's messages per channel",
        category: "Staff",
    }
}