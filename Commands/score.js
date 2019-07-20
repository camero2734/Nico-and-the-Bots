module.exports = {
    
    execute: async function (msg) {
        const BF = '319620325224480768';
        const VSL = '319620276692451328';
        const RAB = '319620417486716940';
        const ST = '319620372305543168';
        const NPI = '319632312654495754';
        const TRENCH = '466627343520104449';
        let albumsArray = [TRENCH, BF, VSL, RAB, ST, NPI];
        const { createCanvas, loadImage, Image, registerFont } = require('canvas');
        // if (msg.author.id !== poot) return msg.channel.embed('Currently under construction!');
        if (msg && msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            let member = msg.mentions.users.first();
            if (member.bot) return msg.channel.send('`Bots do not have score`');
        }
        

        let starttime = Date.now();
		
		var eyed = msg.author.id;
		if ((msg.mentions) && (msg.mentions.users) && (msg.mentions.users.first())) {
			eyed = msg.mentions.users.first().id;
		}

        let getBadges = require("./badges.js");
		let badges = await getBadges(msg.guild.members.get(eyed), Image);
		var num = "";
		var alltime = 0;
		let userLevel = 0;
		sql.all(`SELECT * FROM scores ORDER BY points DESC`).then((rows) => {
			var jkl = "banned_user"
			// let string = `#TØP ${lownum} - ${highnum} Leaderboard: \n \n`;
			var rownum = 1;
			for (let row of rows) {
				if (eyed === row.userId) {
					num += rownum;
					return;
				}
				rownum++
			}
        });
		sql.get(`SELECT * FROM scores2 WHERE userId ="${eyed}"`).then((row0) => {
			if (!row0) row0 = {points: 0, level: 0}
			alltime = row0.points;
            userLevel = row0.level;
			sql.get(`SELECT * FROM scores WHERE userId ="${eyed}"`).then((row) => {
				if (!row) row = {points: 0, xp: 0};
				var rowpoints = row.points;
				var rowlevel = userLevel;
				let rq = 100;
				let totalscore = 0;
                let cL = 0;
                let previous = [];
				while (cL < userLevel + 1) {
                    if (cL === userLevel) previous = [totalscore, rq, cL - 1];
					totalscore += rq;
					rq = (rq + 21) - (Math.pow(1.001450824, rq));
					cL++;
				}
				var rem = Math.floor(totalscore - alltime) + 1;
                let diff = Math.floor(totalscore - previous[0]);
                let percent = (1 - ((rem / diff))).toFixed(3);
				sql.get(`SELECT * FROM daily WHERE userId = "${eyed}"`).then(async (row) => {
					if (!row) row = {xp: 0}
					//var rowxp = row.xp - 1
					var rowxp = "0"
					var options = ["Credits: ", "Poot bux: "]
					var random = Math.floor(Math.random() * 2)
					var rowxp = 0
					if ((row) && (row.xp)) {
						rowxp = row.xp
					}
					registerFont(('./assets/fonts/h.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/f.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/NotoEmoji-Regular.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/a.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/j.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/c.ttf'), { family: 'futura' }); 
					registerFont(('./assets/fonts/br.ttf'), { family: 'futura' });
					var img = new Image();
					var background = new Image();

					var goldcircle = new Image();
					var canvas = createCanvas(500, 500);
					var ctx = canvas.getContext('2d');
					let src = albumsArray.find(id => {
						return msg.member.roles.get(id)
					})
					if (!src) src = "466627343520104449";
					background.src = './albums/' + src + '.png';
					let invertedRoles = [VSL,NPI,RAB,ST];
					let inverted = false;
					if (invertedRoles.indexOf(src) !== -1) inverted = true;
					ctx.drawImage(background, 0, 0, 500, 500);
					var las = msg.guild.members.get(eyed).user.displayAvatarURL.split('?').reverse().pop();

					let las_r = await snekfetch.get(las);
					img.src = las_r.body;

					ctx.drawImage(img, 388, 14, 98, 101);
					ctx.fillStyle = 'white'

					var author = msg.guild.members.get(eyed).displayName
					if (msg.guild.members.get(eyed).user.username.length < author.length) author = msg.guild.members.get(eyed).user.username
					// var fontsize = measure(ctx, author, 1.02)
					var user_name = author.replace(/̶/g, "")
					//
					let maxWidth = 210;
					let maxHeight = 50;
					let measuredTextWidth = 1000;
					let measuredTextHeight = 1000;
					let checkingSize = 100;
					while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
						checkingSize--
						ctx.font = checkingSize + 'px futura'
						let textInfo = ctx.measureText(user_name)
						measuredTextWidth = textInfo.width
						measuredTextHeight = textInfo.emHeightAscent + textInfo.emHeightDescent
					}
					//
					ctx.font = checkingSize + 'px futura'
					//ctx.fillStyle = 'red'
					ctx.textAlign = "start"
					//SCORE USERNAME PLACEMENT
					ctx.fillStyle = (src === TRENCH) ? "black" : (inverted ? "black" : "white");
					ctx.fillText(user_name, 177, 90)
					ctx.font = '30px futura';

					//SCORE POINTS PLACEMENT (ALLTIME AND CURRENT)
					ctx.fillStyle = inverted ? "black" : "white";
					ctx.fillText(rowpoints + ' / ' + alltime, 17, 258)
					//SCORE LEVEL PLACEMENT
					ctx.fillText(rowlevel, 17, 193)
					//SCORE REMAINING LEVEL UP IN PLACEMENT
					let colorsArray = ["#FCE300", "#80271F", "#6BC1DA", "#FC3F03", "#ACCD40", "#C6ADAE"]

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
					//XP BAR

					// ctx.fillText()
					//SCORE CREDITS PLACEMENT
					ctx.fillText(rowxp, 17, 322)
					var na = num
					msg.member = msg.guild.members.get(eyed);
					loadJsonFile('earnedbadges.json').then(async earned => {
						goldcircle.src = './badges/goldcircle.png'
						let goldx = 15
						let goldy = 394
						//SCORE GOLD ICON PLACEMENT
						ctx.drawImage(goldcircle, goldx, goldy, 30, 30)
						let goldsarray = JSON.parse(fs.readFileSync("./golds.json", "utf8"))
						let goldnum = 0
						if (goldsarray[msg.guild.members.get(eyed).user.id]) goldnum = goldsarray[msg.guild.members.get(eyed).user.id]
						ctx.textAlign = 'start'
						//SCORE GOLD TEXT PLACEMENT
						ctx.fillStyle = inverted ? "black" : "white";
						ctx.fillText('x' + goldnum, goldx + 35, goldy + 26)
						if (badges.length > 0) {
							for (let i = 0; i < badges.length; i++) {
								//console.log(badges2[i].src + ' i')
								//Initial x value
								var y_val = 158
								//Num. of badges in each column
								var maxbadges = 3;
								//Calculate y value depending on i #
								var x_val = 80 * (i % maxbadges) + 241
								//Calculate x shift
								let shift = Math.floor(i / maxbadges) * 80
								//Draw the badges!
								ctx.drawImage(badges[i], x_val, y_val + shift, 75, 75)


							}
						}
						ctx.font = '30px futura'
						ctx.textAlign = 'start'
						ctx.fillStyle = (src === TRENCH) ? "black" : (inverted ? "black" : "white");
						//SCORE USER NUMBER PLACEMENT
						ctx.fillText(num, 41, 50)
						ctx.font = '18px futura'
						ctx.textAlign = 'end'
						var length = ctx.measureText(alltime).width

						ctx.fillStyle = 'white'
						
						await msg.channel.send({ file: canvas.toBuffer() });
					})
				})
			})
		})
	},
    info: {
        aliases: false,
        example: "!score (@ user)",
        minarg: 1,
        description: "Displays a user's server score and other stats",
        category: "Basic",
    }
}