module.exports = {
    execute: async function (msg) {
        let [...hexes] = msg.content.replace(/\n+/g, " ").matchAll(/#[0-9A-Fa-f]{6} .+?(?=#|$)/g);
        hexes = hexes.map(h => h[0]);

        for (let h of hexes) {
            let parts = h.split(" ");
            msg.hex = parts.shift();
            msg.content = `${parts.join(" ")} (${msg.hex.toUpperCase()})`;
            let img = await messageToImage(msg, 500, 400);
            let file = new Discord.Attachment(img, "hex.png");
            await msg.channel.send(file);
        }

    },
    info: {
        aliases: false,
        example: "!hex #AEDAED Text Here #123456 Text2 Here",
        minarg: 0,
        description: "Shows an example message with hex color",
        category: "Other",
    }
}
