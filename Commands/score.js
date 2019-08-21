module.exports = {
    
    execute: async function (msg) {
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

        var eyed = msg.author.id;
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
        var rem = Math.floor(totalscore - userEconomy.alltimeScore) + 1; //REMAINING TO NEXT LEVEL
        let diff = Math.floor(totalscore - previousScore); //TOTAL TO NEXT LEVEL
        let percent = (1 - ((rem / diff))).toFixed(3); //RATIO OF REMAINING TO TOTAL

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

        //INITIALIZE IMAGES
        var img = new Image();
        var background = new Image();
        var goldcircle = new Image();

        //Create canvas
        var canvas = createCanvas(500, 500);
        var ctx = canvas.getContext("2d");

        //BACKGROUND SRC
        background.src = "./albums/" + src + ".png";

        //IMG SRC
        let avatar_url = msg.guild.members.get(eyed).user.displayAvatarURL.split("?").reverse().pop();
        let avt_r = await snekfetch.get(avatar_url);
        img.src = avt_r.body;

        //GOLD SRC
        goldcircle.src = "./badges/goldcircle.png";

        //FIND SHORTEST NAME FOR USER
        var username = msg.guild.members.get(eyed).displayName;
        if (msg.guild.members.get(eyed).user.username.length < username.length) username = msg.guild.members.get(eyed).user.username;

        //MAKE TEXT FIT
        let maxWidth = 210;
        let maxHeight = 50;
        let measuredTextWidth = 1000;
        let measuredTextHeight = 1000;
        let checkingSize = 100;
        while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
            checkingSize--;
            ctx.font = checkingSize + "px futura";
            let textInfo = ctx.measureText(username);
            measuredTextWidth = textInfo.width;
            measuredTextHeight = textInfo.emHeightAscent + textInfo.emHeightDescent;
        }

        //DRAW AND WRITE
        ctx.drawImage(background, 0, 0, 500, 500);
        ctx.drawImage(img, 388, 14, 98, 101);
        //USERNAME
        ctx.font = checkingSize + "px futura";
        ctx.textAlign = "start";
        ctx.fillStyle = (src === TRENCH) ? "black" : (inverted ? "black" : "white");
        ctx.fillText(username, 177, 90);
        //POINTS
        ctx.font = "30px futura";
        ctx.fillStyle = inverted ? "black" : "white";
        ctx.fillText(userEconomy.monthlyScore + " / " + userEconomy.alltimeScore, 17, 258);
        //LEVEL
        ctx.fillText(userEconomy.alltimeLevel, 17, 193);
        //LEVEL UP BAR / POINTS TO NEXT LEVEL
        let colorsArray = ["#FCE300", "#80271F", "#6BC1DA", "#FC3F03", "#ACCD40", "#C6ADAE"];
        ctx.save();
        ctx.fillStyle = "#555555"; //BACKGROUND BAR
        ctx.fillRect(20, 360, 186, 30);
        ctx.fillStyle = colorsArray[albumsArray.indexOf(src)];
        ctx.fillRect(20, 360, 186 * percent, 30);
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(rem, 113, 387);
        ctx.fillText(rem, 113, 387);
        ctx.restore();
        //CREDITS
        ctx.fillText(userEconomy.credits, 17, 322);
        //GOLD
        let goldx = 15;
        let goldy = 394;
        ctx.drawImage(goldcircle, goldx, goldy, 30, 30);
        let goldnum = userGold && userGold.count ? userGold.count : 0;
        ctx.textAlign = "start";
        ctx.fillStyle = inverted ? "black" : "white";
        ctx.fillText("x" + goldnum, goldx + 35, goldy + 26);
        //BADGES
        if (badges.length > 0) {
            for (let i = 0; i < badges.length; i++) {
                //Initial x value
                var y_val = 158;
                //Num. of badges in each column
                var maxbadges = 3;
                //Calculate y value depending on i #
                var x_val = 80 * (i % maxbadges) + 241;
                //Calculate x shift
                let shift = Math.floor(i / maxbadges) * 80;
                //Draw the badges!
                ctx.drawImage(badges[i], x_val, y_val + shift, 75, 75);
            }
        }
        //MONTHLY RANKING
        ctx.font = "30px futura";
        ctx.textAlign = "start";
        ctx.fillStyle = (src === TRENCH) ? "black" : (inverted ? "black" : "white");
        ctx.fillText(placeNum, 41, 50);
        await msg.channel.send({ file: canvas.toBuffer() });
		
    },
    info: {
        aliases: false,
        example: "!score (@ user)",
        minarg: 1,
        description: "Displays a user's server score and other stats",
        category: "Basic"
    }
};