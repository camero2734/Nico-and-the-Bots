module.exports = {
    execute: function(msg) {
        const average = require('image-average-color');
        let args = msg.args
        let url;
        if (typeof msg.attachments !== 'undefined' && typeof msg.attachments.array()[0] !== 'undefined') {
            let attachments = msg.attachments.array()
            url = attachments[0].url
        } 
        else if (args[1] && (args[1].indexOf('jpg') || args[1].indexOf('png'))) {
            url = args[1]
        }
        else return this.embed(msg)
        if (!url) return this.embed(msg)
        snekfetch.get(url).then((r) => {
            average(r.body, (err, color) => {
                if (err) throw err;
                var [red, green, blue, alpha] = color;
                let embed = new Discord.RichEmbed({ title: "Color" })
                embed.setColor([red, green, blue])
                embed.addField("RGB", `[${red}, ${green}, ${blue}]`)
                embed.addField("Hex", embed.color.toString(16))
                msg.channel.send({ embed: embed })
            });
        }).catch(e => console.log(e,/AVGCOLOR E/))
    },
    info: {
        aliases: false,
        example: "!avgcolor",
        minarg: 0,
        description: "Returns avg color of image",
        category: "Other",
    }
}