module.exports = {
    execute: function (msg) {
        msg.channel.embed("DM'd you the link!")
        msg.author.createDM().then((c) => {
            c.send("https://docs.google.com/document/d/1EhkRbCmJ6KKoqQ8k2gTLjFlAHnZuhQwOAP14dPf43w0/edit?usp=sharing")
        })
    },
    info: {
        aliases: false,
        example: "!guide",
        minarg: 0,
        description: "DMs a simple guide for using commands",
        category: "Info",
    }
}