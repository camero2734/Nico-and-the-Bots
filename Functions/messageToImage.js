module.exports = async function(msg, goalW, goalH) {
    return new Promise(async resolve => {
        const { createCanvas, loadImage, Image, registerFont } = require('canvas2');
        const snekfetch = require("snekfetch");
        let emojis = msg.content.match(/<.*?:\d{18}>/g);
        //EMOJIS
        let text = msg.content.replace(/<.*?:\d{18}>/g, "　"); //REPLACE WITH SPACE TO DRAW EMOJI OVER
        //CHANNELS
        for (let i = 0; i < text.length; i++) {
            let next21 = text.substring(i, i+21);
            if (/<#\d{18}>/.test(next21)) {
                text = text.replace(new RegExp(next21, "g"), `#${msg.guild.channels.get(next21.replace(/<|>|#/g, "")).name}`)
                i = 0;
            }
        }
        //MENTIONS
        for (let i = 0; i < text.length; i++) {
            let next22 = text.substring(i, i+22);
            //USER
            if (/<@\d{18}>/.test(next22)) {
                next22 = next22.substring(0, 21);
                console.log(new RegExp(next22.trim(), "g"));
                text = text.replace(new RegExp(next22, "g"), `@${msg.guild.members.get(next22.replace(/<|>|@|&/g, "")).displayName}`)
                console.log(text, /NEWTEXT/)
            } else if (/<@!\d{18}>/.test(next22)) {
                text = text.replace(new RegExp(next22, "g"), `@${msg.guild.members.get(next22.replace(/<|>|@|&|!/g, "")).displayName}`)
            }
            //ROLE
            else if (/<@&\d{18}>/.test(next22)) {
                text = text.replace(new RegExp(next22, "g"), `@${msg.guild.roles.get(next22.replace(/<|>|@|&/g, "")).name}`)
            }
        }
        //CATCH-ALL
        text = text.replace(/<.*?>/g, "?");

        let date = msg.createdAt;
        let avatar = msg.author.displayAvatarURL;

        function hasArray(content, arr) {
            let hasOne = false;
            for (let c of arr) if (content.toLowerCase().indexOf(c) !== -1) hasOne = true;
            return hasOne;
        }
        let img = (msg.attachments && msg.attachments.first() && msg.attachments.first().url && hasArray(msg.attachments.first().url, [".jpg", ".png", ".gif"])) ? msg.attachments.first().url : null;

        try {
            let uploaded = (await snekfetch.get(avatar)).body;
            let scale = 3;
            let widthScale = 1;
            var canvas = createCanvas(363 * scale, 77 * scale);
            var ctx = canvas.getContext('2d');

            registerFont(('./fonts/whitney.otf'), { family: 'whitney' });
            registerFont(('./assets/fonts/NotoEmoji-Regular.ttf'), { family: 'whitney' }); 

            //PREMEASURE TEXT
            ctx.font = (20 * scale) + 'px whitney'
            let nameWidth = ctx.measureText(msg.member.displayName).width;

            ctx.font = (16 * scale) + 'px whitney';
            let timeWidth = ctx.measureText("Today at " + date.getHours().toString().padStart(2, '0') + ":" + date.getMinutes().toString().padStart(2, '0')).width;

            let lines = [text];
            while (lines.some(l => ctx.measureText(l).width > 1203 * widthScale)) {
                let lastLineWords = lines[lines.length - 1].split(" ");
                let cutoff = 0;
                while (ctx.measureText(lastLineWords.slice(0, lastLineWords.length - cutoff).join(" ")).width > 1203 * widthScale) cutoff++;
                if (cutoff === lastLineWords.length) {
                    cutoff = 0;
                    let lastLineLetters = lines[lines.length - 1];
                    while (ctx.measureText(lastLineLetters.substring(0, lastLineLetters.length - cutoff)).width > 1203 * widthScale) cutoff++;
                    let line1 = lastLineLetters.substring(0, lastLineLetters.length - cutoff);
                    let line2 = lastLineLetters.substring(lastLineLetters.length - cutoff, lastLineLetters.length);
                    lines[lines.length - 1] = line1;
                    lines.push(line2);
                } else {
                    let line1 = lastLineWords.slice(0, lastLineWords.length - cutoff);
                    let line2 = lastLineWords.slice(lastLineWords.length - cutoff, lastLineWords.length);
                    lines[lines.length - 1] = line1.join(" ");
                    lines.push(line2.join(" "));
                }
            }
            
            ctx.font = (19 * scale) + 'px whitney';
            let textWidth = ctx.measureText(lines[0]).width;
            for (let line of lines) if (ctx.measureText(line).width > textWidth) textWidth = ctx.measureText(line).width;

            let maxWidth = Math.max(82 * scale + textWidth, 82 * scale + nameWidth + 15 + timeWidth) + 40;
            let maxHeight = canvas.height + 25 * scale * lines.length;

           

            let imgObject = false;
            let originalImg;
            if (img) {
                let imgUploaded = (await snekfetch.get(img)).body;
                imgObject = new Image();
                originalImg = new Image();
                imgObject.src = imgUploaded;
                originalImg.src = imgUploaded;
                console.log(imgObject.width, imgObject.height);
                while (imgObject.width * scale > 1203 * widthScale) {
                    imgObject.width *= 0.98;
                    imgObject.height *= 0.98;
                }
                console.log(imgObject.width, imgObject.height);
                maxHeight += imgObject.height * scale;
                maxWidth = Math.max(maxWidth, imgObject.width * scale + 40);
            }

            let mult = 1;
            while (goalW * mult < maxWidth || goalH * mult < maxHeight) mult+=0.1;

            canvas.width = goalW * mult;
            canvas.height = goalH * mult;
            console.log(maxWidth);

            let pfp = new Image();
            let mask = new Image();
            mask.src = "./images/mask.png";
            pfp.src = uploaded;

            ctx.fillStyle = "#36393F";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // ctx.fillStyle = "#f04747"
            // ctx.translate(0, 100);
            // ctx.font = (18 * scale) + 'px whitney';
            // ctx.fillText(" ───────── NEW MESSAGES ─────────", 0, 0);

            ctx.drawImage(pfp, 7 * scale, 10 * scale, 48 * scale, 48 * scale);
            ctx.drawImage(mask, 7 * scale, 10 * scale, 48 * scale, 48 * scale);

            ctx.font = (20 * scale) + 'px whitney'
            ctx.fillStyle = msg.member.displayHexColor;
            ctx.fillText(msg.member.displayName, 82 * scale, 26 * scale);

            let prevWidth = ctx.measureText(msg.member.displayName).width;
            ctx.font = (16 * scale) + 'px whitney'
            ctx.fillStyle = "#595B60";
            ctx.fillText("Today at " + date.getHours().toString().padStart(2, '0') + ":" + date.getMinutes().toString().padStart(2, '0'), 82 * scale + prevWidth + 15, 26 * scale);

            ctx.font = (19 * scale) + 'px whitney'
            ctx.fillStyle = "white";
            let lastY = 0;
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                ctx.fillText(line, 82 * scale, 53 * scale + 25 * scale * i);
                lastY = line === "" ? 53 * scale + 25 * scale * i : 53 * scale + 25 * scale * (i+1);
            }
            
            if (img && imgObject) {
                console.log("yes");
                let x = 82 * scale;
                let y = lastY - 10;
                let width = imgObject.width * scale;
                let height = imgObject.height * scale;
                imgObject.width = originalImg.width;
                imgObject.height = originalImg.height;
                ctx.drawImage(imgObject,x,y,width,height);
            }

            if (emojis && emojis.length > 0) {
                for (let i = 0; i < lines.length; i++) {
                    for (let j = 0; j < lines[i].length; j++) {
                        if (lines[i][j] === "　") {
                            let cutLine = lines[i].substring(0, j);
                            console.log(cutLine, /CUTLINE/);
                            let x = 82 * scale + ctx.measureText(cutLine).width;
                            let y = 53 * scale + 25 * scale * i - 50;
                            let emoji = emojis.shift();
                            let idArr = emoji.split(":");
                            let id = idArr[idArr.length - 1].replace(">", "");
                            let emojiUrl = `https://cdn.discordapp.com/emojis/${id}.png`;
                            let emojiBuffer = (await snekfetch.get(emojiUrl)).body;
                            let emojiImg = new Image();
                            emojiImg.src = emojiBuffer;
                            ctx.drawImage(emojiImg, x, y, (57/3)*scale, (57/3)*scale);
                        }
                    }
                }
            }

            resolve(canvas.toBuffer());
        } catch (e) {
            console.log(e);
            resolve(null);
        }
    })
}