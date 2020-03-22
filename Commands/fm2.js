module.exports = {
    execute: async function (msg) {

        const { loadImage, createCanvas, registerFont } =  Canvas;
        //DETERMINE INPUT TYPE
        let username = null;
        //MENTION
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            let user_id = msg.mentions.users.first().id;
            let mentionedItem = await connection.getRepository(Item).findOne({ id: user_id, type: "FM" });
            if (!mentionedItem) return msg.channel.embed("The mentioned user does not have their FM set up!");
            else username = mentionedItem.title;
        }
        //USERNAME
        else if (msg.args && msg.args.length > 1) {
            username = removeCommand(msg.content);
        }
        //OWN
        else {
            let userItem = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "FM" });
            if (!userItem) return msg.channel.embed("Your FM is not set up! Use `!setfm` to set it up.");
            else username = userItem.title;
        }

        try {
            let url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.LASTFM}&format=json`;
            let info = (await snekfetch.get(url)).body.recenttracks;
            let total = info["@attr"].total;
            let track = { album: info.track[0].album["#text"], artist: info.track[0].artist["#text"], name: info.track[0].name, date: info.track[0].date ? "Played: " + info.track[0].date["#text"] : "Now playing" };

            let images = info.track.map(t => t.image.pop()["#text"]).slice(0, 10);


            let canvas = createCanvas(1200, 500);
            let ctx = canvas.getContext("2d");

            registerFont(("./assets/fonts/h.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/NotoEmoji-Regular.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/a.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/j.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/c.ttf"), { family: "futura" });
            registerFont(("./assets/fonts/br.ttf"), { family: "futura" });

            ctx.font = "50px futura";
            let img = await loadImage("./images/lastfm.png");

            let nameLength = ctx.measureText(username).width;
            let start = (1200 - 85 - 15 - nameLength) / 2;

            ctx.fillStyle = "#AAAAAA";
            ctx.fillRect(0, 0, 1200, 500);
            ctx.drawImage(img, start, 40, 85, 47);
            ctx.fillStyle = "white";
            ctx.fillText(username, start + 15 + 85, 87);

            let startX = 450;
            let percentShow = 0.3;
            console.log(images.length, /IMAGES/);
            for (let i in images) {
                let albumImg = await loadImage(images[i]);
                let dimension = 300 * Math.pow(0.8, i);

                if (i == 0) {
                    ctx.drawImage(albumImg, startX, 50 + (450 - dimension) / 2, dimension, dimension);
                } else {
                    let sx = (1 - percentShow) * albumImg.width;
                    let sy = 0;
                    let swidth = percentShow * albumImg.width;
                    let sheight = albumImg.height;
                    let y = 50 + (450 - dimension) / 2;
                    let _width =  percentShow * dimension;
                    let _height = dimension;
                    console.log(i, sx, sy, swidth, sheight, startX, y, _width, _height);
                    ctx.drawImage(albumImg, sx, sy, swidth, sheight, startX, y, _width, _height);
                }

                startX += (i == 0 ? dimension : percentShow * dimension);
                ctx.globalAlpha *= 0.9;
            }

            msg.channel.send(new Discord.Attachment(canvas.toBuffer(), "fm.png"));
            /*
            let embed = new Discord.RichEmbed().setColor(msg.member.displayHexColor);
            embed.setTitle(username + "'s FM");
            embed.addField("Title", track.name, true);
            embed.addField("Album", track.album, true);
            embed.addField("Artist", track.artist, true);
            embed.setThumbnail(track.image);
            embed.setFooter(track.date + ` (${total} scrobbles total)`, bot.displayAvatarURL);
            msg.channel.send(embed);
            */
        } catch(e) {
            console.log(e, /FM_ERROR/);
            msg.channel.embed("Error in fetching the FM. Did you set your FM correctly?");
        }
    },
    info: {
        aliases: false,
        example: "!fm2 pootusmaximus",
        minarg: 0,
        description: "Sends an embed with last scrobbled song from lastfm",
        category: "N/A"
    }
};
