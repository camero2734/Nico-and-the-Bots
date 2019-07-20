module.exports = {
    execute: async function (msg, args) {
        let provided_id = args[1]
        if (args[1] !== msg.author.id) return msg.channel.send("`In order to ensure you meant to use this command, please use the command again with your user id at the end.`")
        let row = await sql.get(`SELECT * FROM blurrybox WHERE userid="${msg.author.id}"`)
        if (!row) return msg.channel.send("`You don't have anything to delete!`")
        await sql.run(`UPDATE blurrybox SET Ingot="0", Trophy="0", Block="0", Steal="0" WHERE userid="${msg.author.id}"`);
        msg.channel.send("`Your blurrybox inventory has been successfully cleared`")
    },
    info: {
        aliases: false,
        example: "!resetmyblurrybox [your user id]",
        minarg: 0,
        description: "Resets your !blurrybox inventory. Be cautious- there is no undoing this.",
        category: "blurrybox",
    }
}