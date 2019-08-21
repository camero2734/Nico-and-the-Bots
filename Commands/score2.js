module.exports = {
    
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed("This command is under construction.");
        const BF = "319620325224480768";
        const VSL = "319620276692451328";
        const RAB = "319620417486716940";
        const ST = "319620372305543168";
        const NPI = "319632312654495754";
        const TRENCH = "466627343520104449";
        let albumsArray = [TRENCH, BF, VSL, RAB, ST, NPI];
        const { createCanvas, loadImage, Image, registerFont } = require("canvas");
		
        if (msg && msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            let member = msg.mentions.users.first();
            if (member.bot) return msg.channel.send("`Bots do not have score`");
        }

        let eyed = msg.author.id;
        if ((msg.mentions) && (msg.mentions.users) && (msg.mentions.users.first())) {
            eyed = msg.mentions.users.first().id;
        }
		
        let userGold = await connection.getRepository(Counter).findOne({ id: eyed, title: "GoldCount" });
        let userEconomy = await connection.getRepository(Economy).findOne({ id: eyed });
        if (!userEconomy) userEconomy = new Economy(eyed);
        let economies = await connection.getRepository(Economy).find({ monthlyScore: typeorm.MoreThan(userEconomy.monthlyScore) });
        let placeNum = economies.length + 1;
		

        let getBadges = require("./badges.js");
        let badges = await getBadges(msg.guild.members.get(eyed), Image, userGold, placeNum);
        //CALCULATE POINTS TO NEXT LEVEL
        let rq = 100;
        let totalscore = 0;
        let cL = 0;
        let previousScore = 0;
        while (cL < userEconomy.alltimeLevel + 1) {
            if (cL === userEconomy.alltimeLevel) previousScore = totalscore;
            totalscore += rq;
            rq = (rq + 21) - (Math.pow(1.001450824, rq));
            cL++;
        }
        let rem = Math.floor(totalscore - userEconomy.alltimeScore) + 1; //REMAINING TO NEXT LEVEL
        let diff = Math.floor(totalscore - previousScore); //TOTAL TO NEXT LEVEL
        let percent = (1 - ((rem / diff))).toFixed(3); //RATIO OF REMAINING TO TOTAL

        //FIND SHORTEST NAME FOR USER
        let username = msg.guild.members.get(eyed).displayName;
        if (msg.guild.members.get(eyed).user.username.length < username.length) username = msg.guild.members.get(eyed).user.username;

        //IMG SRC
        let avatar_url = msg.guild.members.get(eyed).user.displayAvatarURL.split("?").reverse().pop();
        let avt_r = await snekfetch.get(avatar_url);
        let avatar = await loadImage(avt_r.body);

        //GOLD SRC
        let goldImg = await loadImage("./badges/goldcircle.png");

        //LOAD FONTS
        registerFont(("./assets/fonts/h.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/NotoEmoji-Regular.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/a.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/j.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/c.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/br.ttf"), { family: "futura" });

        //FIND USER ALBUM ROLE (TRENCH => DEFAULT)
        let src = albumsArray.find(id => msg.guild.members.get(eyed).roles.get(id)) || TRENCH;

        //changes font color based on background color
        let invertedRoles = [VSL, NPI, RAB, ST];
        let inverted = false;
        if (invertedRoles.indexOf(src) !== -1) inverted = true;

        //SCORE AREAS
        let areas = {
            badges: {
                x: 348,
                y: 352,
                w: 379,
                h: 380
            },
            items: {
                x: 348,
                y: 212,
                w: 379,
                h: 70
            },
            avatar: {
                x: 20,
                y: 20,
                w: 150,
                h: 150
            },
            score: {
                x: 29,
                y: 570,
                w: 300,
                h: 201
            }
        };
        //ROLE OPTIONS
        let options = {
            "319620417486716940": { //RAB
                overlayColor: "#9bc1db",
                textColor: "#000000",
                backgroundColor: "#ffffff",
                images: [{
                    x: areas.badges.x,
                    y: areas.badges.y,
                    w: areas.badges.w,
                    h: areas.badges.h,
                    opacity: 0.75,
                    colorBackground: true,
                    img: await loadImage("./albums/score/RAB/badges.png")
                },
                {
                    x: areas.items.x,
                    y: areas.items.y,
                    w: areas.items.w,
                    h: areas.items.h,
                    opacity: 0.75,
                    colorBackground: true,
                    img: await loadImage("./albums/score/RAB/items.png")
                }
                ]
            }
        };

        let userOptions = options[src];
        userOptions.images.push({ x: areas.avatar.x, y: areas.avatar.y, w: areas.avatar.w, h: areas.avatar.h, img: avatar });
        //Create canvas
        let canvas = createCanvas(750, 750);
        let ctx = canvas.getContext("2d");

        //overlay
        let overlay = await loadImage("./albums/score/overlay.png");
        console.log(userOptions.backgroundColor);
        ctx.fillStyle = userOptions.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);

        //Recolor overlay
        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: null, g: null, b: null };
        }
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let newC = hexToRgb(userOptions.overlayColor);
        let notC = hexToRgb(userOptions.backgroundColor);
        for (var i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] !== notC.r || imageData.data[i + 1] !== notC.g || imageData.data[i + 2] !== notC.b) {
                imageData.data[i] = newC.r;
                imageData.data[i + 1] = newC.g;
                imageData.data[i + 2] = newC.b; 
            }
        }
        ctx.putImageData(imageData, 0, 0);

        for (let image of userOptions.images) {
            ctx.save();
            if (image.colorBackground) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(image.x, image.y, image.w, image.h);
            }
            if (image.opacity) ctx.globalAlpha = image.opacity;
            ctx.drawImage(image.img, image.x, image.y, image.w, image.h);
            ctx.restore();
        }

        

        //WRITE SCORES
        ctx.font = "30px futura";
        ctx.fillStyle = userOptions.textColor;
        ctx.fillText("Monthly:", areas.score.x, areas.score.y);
        let shiftX = ctx.measureText("Monthly:").width;
        ctx.fillText(userEconomy.monthlyScore, areas.score.x + shiftX, areas.score.y);
        

       

        //BADGES
        let cols = Math.floor(Math.sqrt(badges.length));
        let rows = cols;
        let bufferSize = 0.1;
        if (badges.length > 0) {
            //Calculate available dimensions
            let size_x = areas.badges.w / ((1 + bufferSize) * cols + bufferSize);
            let size_y = areas.badges.h / ((1 + bufferSize) * rows + bufferSize);
            //Make square
            let size = Math.min(size_x, size_y);

            let b_x = (areas.badges.w - cols * size) / (cols + 1);
            let b_y = (areas.badges.h - rows * size) / (rows + 1);

            for (let i = 0; i < Math.min(badges.length, cols * rows); i++) {
                let x_val = areas.badges.x +           (i % cols) * size + (b_x *           ((i % cols) + 1));
                let y_val = areas.badges.y + Math.floor(i / cols) * size + (b_y * (Math.floor(i / cols) + 1));
                //Draw the badges!
                ctx.drawImage(badges[i], x_val, y_val, size, size);
            }
        }
        //MONTHLY RANKING
        ctx.font = "50px futura";
        ctx.textAlign = "start";
        ctx.fillStyle = (src === TRENCH) ? "black" : (inverted ? "black" : "white");
        ctx.fillText(placeNum, 631, 98);
        return msg.channel.send(new Discord.Attachment(canvas.toBuffer(), "score.png"));
		
    },
    info: {
        aliases: false,
        example: "!score2 (@ user)",
        minarg: 1,
        description: "Displays a user's server score2 and other stats",
        category: "Basic"
    }
};