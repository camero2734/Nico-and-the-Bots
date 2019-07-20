module.exports = {
    execute: async function (msg) {
        let isURL = require("is-url");
        let exiftool = require("exiftool-wrapper")
        const { createCanvas, loadImage, Image } = require('canvas')
        let url;

        if (isURL(msg.args[1])) url = msg.args[1];
        else if (msg.attachments && msg.attachments.first()) url = msg.attachments.first().url;
        else return msg.channel.embed("Invalid url/upload given.");

        


        try {
            let r = await snekfetch.get(url);
            let buffer = r.body;
            let m = await exiftool.metadata({source: buffer})
            
            //Canvas initialization
            let canvas = createCanvas(500, 15 * Object.keys(m).length)
            let ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0,0,500,15 * Object.keys(m).length);
            ctx.fillStyle = 'black';
            let ind = 0;
            for (let property in m) {
                let text = m[property];

                if (typeof text !== "number" && typeof text === "string" && text.startsWith("base64")) {
                    //if (property === "Slices") console.log(new Buffer(text.split("base64:")[1], 'base64').toString('ascii'), /TEXT/)
                    text = new Buffer(text.split("base64:")[1], 'base64').toString('ascii').replace(/[\x00-\x1F\x7F-\x9F]/g, "");;
                    console.log(text)
                }
                ctx.fillText(`${property}: ${text}\n`, 10, 15 * ind++);
            }
            msg.channel.send(new Discord.Attachment(canvas.toBuffer(), "exif.png"));
        } catch(e) {
            console.log(e, /METADATA_ERR/)
            return msg.channel.embed("Unable to extract metadata.")
        }
        
    },
    info: {
        aliases: ["metadata","exif"],
        example: "!metadata [UPLOAD or URL]",
        minarg: 0,
        description: "Displays exif/metadata for a file",
        category: "Other",
    }
}

/*

*/