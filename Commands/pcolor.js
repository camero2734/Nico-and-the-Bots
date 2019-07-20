module.exports = {
    execute: function (msg) {
        let text = msg.removeCommand(msg.content)
        text = text.replace(/#/g, "")
        if (!isHexaColor(text)) return msg.channel.send('`Proper command usage is !pcolor [#hex]`')
        profiles[msg.author.id]['color'] = '#' + text
        msg.channel.send('`Updated your profile color!`')
        fs.writeFile("./profiles.json", JSON.stringify(profiles), (err) => {
            if (err) console.error(err)
        })
        function isHexaColor(sNum) {
            return (typeof sNum === "string") && sNum.length === 6
                && !isNaN(parseInt(sNum, 16));
        }
    },
    info: {
        aliases: false,
        example: "!pcolor [hex color]",
        minarg: 2,
        description: "Changes the color of the text on your profile",
        category: "Profile",
    }
}