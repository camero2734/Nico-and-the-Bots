module.exports = {
    execute: async function (msg) {
        const { createCanvas, loadImage, Image, registerFont } = require('canvas');
        let clownPath = "./images/clown.png";
        let args = msg.content.split(" ");
        let url = args[1] ? args[1] : (msg.attachments && msg.attachments.first() && msg.attachments.first().url);
        if ((!url || !name) && !msg.specialAttachment) return msg.channel.embed("You must provide a url or upload an image!\n\n**!clown http://www.website.com/image.png**");

        try {
            let uploaded = msg.specialAttachment ? msg.specialAttachment : (await snekfetch.get(url)).body;
            let scale = 2;
            var canvas = createCanvas(856*scale, 480*scale);
            var ctx = canvas.getContext('2d');
    
            let bg = new Image();
            let fg = new Image();
            bg.src = clownPath;
            fg.src = uploaded;
    
            ctx.drawImage(bg, 0, 0, 856*scale, 480*scale);
            ctx.translate(23*scale, 110*scale);
            ctx.rotate(-Math.PI / 15.0);
            ctx.drawImage(fg, 0, 0, 174*scale, 147*scale);
    
            await msg.channel.send(new Discord.Attachment(canvas.toBuffer(), "clown.png"));
        } catch(e) {
            msg.channel.embed("Error!");
            console.log(e);
        }

        

    },
    info: {
        aliases: false,
        example: "!clown [Link OR Upload]",
        minarg: 0,
        description: "Puts whatever image you choose onto the clown's computer",
        category: "Fun",
    }
}