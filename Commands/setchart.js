module.exports = {
    execute: async function (msg) {
        let content = removeCommand(msg.content).trim();
        let url = null;
        if (((content.startsWith("http") && content.indexOf("://")) || (content.startsWith("www."))) && (content.indexOf(".png") || content.indexOf(".jpg"))) {
            // Image URL
            url = content;
        } else if (msg.attachments && msg.attachments.first()) {
            let att = msg.attachments.first();
            if (!att.filename.endsWith(".png") && !att.filename.endsWith(".jpg")) return msg.channel.embed("Invalid file given");
            url = msg.attachments.first().url;
        } else return msg.channel.embed("You must either upload an image or provide an image URL (png or jpg)");

        let prevCharts = await connection.getRepository(Item).find({ id: msg.author.id, type: "Chart" });
        if (prevCharts && prevCharts.length > 0) {
            await connection.manager.remove(prevCharts);
        }
        let chartItem = new Item(msg.author.id, url, "Chart", Date.now());
        await connection.manager.save(chartItem);
        await msg.channel.embed("Updated your chart successfully!");
    },
    info: {
        aliases: false,
        example: "!setchart [Image upload]",
        minarg: 0,
        description: "Sets your chart. Upload an image",
        category: "N/A"
    }
};