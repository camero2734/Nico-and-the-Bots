module.exports = {
    execute: async function (msg) {
        try {
            const imageDownload = require('image-download');
            const { createCanvas, loadImage, Image, registerFont } = require('canvas');
            let bot = msg.client;
    
            //Canvas Initialization
            let canvas = createCanvas(500, 600);
            let ctx = canvas.getContext('2d');
            registerFonts();
            let img = await loadImage('./albums/leaderboardNew.png');
            ctx.drawImage(img, 0, 0);
            //Border
            let startY = 65;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.strokeRect(20, (startY-5), 460, (startY-5) + 475);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(20, (startY-5), 460, (startY-5) + 475);
            
            //Get the page number and bounds
            let page = msg.args && !isNaN(msg.args[1]) && msg.args[1] > 0 ? ~~msg.args[1] : 1;
            //Some initialization 
            let economies = await connection.getRepository(Economy).createQueryBuilder("e").orderBy("e.alltimeScore", "DESC").limit(10).offset(10 * page - 10).getMany();
            let uName = "invalid_user";
            let rownum = 10 * page - 9;
            for (let ec of economies) {
                if (bot.users.get(ec.id)) {
                    uName = bot.users.get(ec.id).username;
                    if ((msg.guild.members.get(ec.id)) && (msg.guild.members.get(ec.id).nickname)) {
                        uName = msg.guild.members.get(ec.id).nickname;
                    }
                }

                let diff = 1.15 * ((rownum - 1) % 10);

                //Header
                ctx.fillStyle = "#fce300";
                ctx.textAlign = 'center';
                ctx.font = "48px futura";
                ctx.fillText("Leaderboard", 250, 50);
                //Avatar
                if (msg.guild.members.get(ec.id)) {
                    let r;
                    try {
                        r = await imageDownload(msg.guild.members.get(ec.id).user.displayAvatarURL.split("?")[0] + "?size=40");
                    } catch(e) {
                        r = "./images/defaultAvatar.png";
                    }
                    
                    let pfp = await loadImage(r);
                    ctx.drawImage(pfp, 80, (startY-1) + 46.3 * diff, 42, 42);
                }

                //STYLE ME!!
                ctx.textAlign = 'end';
                ctx.font = "25px futura";
                ctx.fillStyle = 'white';

                //Row num
                ctx.fillText(rownum, 65, (startY+30) + 46.1 * diff);

                //Username
                ctx.textAlign = 'start';
                if (msg.guild.members.get(ec.id)) ctx.fillStyle = msg.guild.members.get(ec.id).displayHexColor;
                else ctx.fillStyle = 'white';
                let user_name = uName.replace(/̶/g, "");
                ctx.fillText(user_name, 132, (startY+21) + 46.3 * diff, 330);

                //Level and points
                ctx.font = "16px futura";
                ctx.fillStyle = 'white';
                ctx.fillText("Level: " + ec.alltimeLevel, 300, (startY+43) + 45.9 * diff);
                ctx.fillText("Points: " + ec.alltimeScore, 165, (startY+43) + 46.1 * diff);
                //Time hehe
                let hours = (ec.alltimeScore / 300).toFixed(2);
                ctx.fillStyle = '#00ff00';
                ctx.fillText(`(${hours} hrs)`, 380, (startY+43) + 45.9 * diff);

                rownum++;
            }
            msg.channel.send({file: canvas.toBuffer()});
    
            
            function registerFonts() {
                registerFont(('./assets/fonts/h.ttf'), { family: 'futura' }); 
                registerFont(('./assets/fonts/f.ttf'), { family: 'futura' }); 
                registerFont(('./assets/fonts/NotoEmoji-Regular.ttf'), { family: 'futura' }); 
                registerFont(('./assets/fonts/a.ttf'), { family: 'futura' });
                registerFont(('./assets/fonts/j.ttf'), { family: 'futura' }); 
                registerFont(('./assets/fonts/c.ttf'), { family: 'futura' }); 
                registerFont(('./assets/fonts/br.ttf'), { family: 'futura' }); 
            }
        } catch(e) {
            console.log(e, /ALLTOPERR/)
        }
    },
    info: {
        aliases: false,
        example: "!top (page number)",
        minarg: 1,
        description: "Displays the all-time server leaderboard",
        category: "Basic",
    }
}