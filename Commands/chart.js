module.exports = {
    execute: async function (msg) {
        let id = msg.author.id;
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            id = msg.mentions.users.first().id;
        }
        let chart = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "Chart" });
        if (!chart) return await msg.channel.embed("You do not have a chart set! Set it with `!setchart`.");

        await msg.channel.send(chart.title);
    },
    info: {
        aliases: false,
        example: "!chart",
        minarg: 0,
        description: "Sends your chart. Set with !setchart",
        category: "N/A"
    }
};