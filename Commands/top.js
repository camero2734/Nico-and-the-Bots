

module.exports = {
    execute: async function (msg) {
        try {
            const { createCanvas, loadImage, Image, registerFont } = require('canvas');

            let bot = msg.client;
    
            //Canvas Initialization
            let canvas = createCanvas(500, 600)
            let ctx = canvas.getContext('2d');
            registerFonts();
            let img = await loadImage('./albums/leaderboardNew.png')
            ctx.drawImage(img, 0, 0);
            
            //Border
            let startY = 65;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            ctx.strokeRect(20, (startY-5), 460, (startY-5) + 475);
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(20, (startY-5), 460, (startY-5) + 475);
            
            //Get the page number and bounds
            let page = msg.args && !isNaN(msg.args[1]) && msg.args[1] > 0 ? ~~msg.args[1] : 1
            let highnum = Math.floor(page * 10)
            let lownum = highnum - 9
            
            //Some initialization 
            let rows = await sql.all(`SELECT DISTINCT * FROM scores ORDER BY points DESC`)
            let uName = "invalid_user"
            let string = `#TØP ${lownum} - ${highnum} Leaderboard: \n \n`;
            let rownum = 1
    
            for (let row of rows) {
                if (bot.users.get(row.userId)) {
                    uName = bot.users.get(row.userId).username
                    if ((msg.guild.members.get(row.userId)) && (msg.guild.members.get(row.userId).nickname)) {
                        uName = msg.guild.members.get(row.userId).nickname
                    }
                } else {
                    uName = "invalid_user"
                    sql.get(`DELETE FROM scores WHERE userId = "${row.userId}"`)
                }
    
                //In desired range
                if ((rownum >= lownum) && (rownum <= highnum)) {
                    let diff = 1.15 * ((rownum - 1) % 10);
    
                    //Header
                    ctx.fillStyle = "#fce300";
                    ctx.textAlign = 'center';
                    ctx.font = "48px futura";
                    ctx.fillText("Leaderboard", 250, 50);
    
                    //Avatar
                    if (msg.guild.members.get(row.userId)) {
                        let r;
                        try {
                            r = await snekfetch.get(msg.guild.members.get(row.userId).user.displayAvatarURL);
                        } catch(e) {
                            r = {body: "./images/defaultAvatar.png"}
                        }
                        
                        let pfp = await loadImage(r.body);
                        ctx.drawImage(pfp, 80, (startY-1) + 46.3 * diff, 42, 42);
                    }
    
                    //STYLE ME!!
                    ctx.textAlign = 'end';
                    ctx.font = "25px futura";
                    ctx.fillStyle = 'white';
    
                    //Row num
                    ctx.fillText(rownum, 65, (startY+30) + 46.1 * diff)
    
                    //Username
                    ctx.textAlign = 'start';
                    if (msg.guild.members.get(row.userId)) ctx.fillStyle = msg.guild.members.get(row.userId).displayHexColor
                    else ctx.fillStyle = 'white'
                    let user_name = uName.replace(/̶/g, "")
                    ctx.fillText(user_name, 132, (startY+21) + 46.3 * diff, 330);
    
                    //Level and points
                    ctx.font = "16px futura"
                    ctx.fillStyle = 'white'
                    ctx.fillText("Level: " + row.level, 300, (startY+43) + 45.9 * diff)
                    ctx.fillText("Points: " + row.points, 165, (startY+43) + 46.1 * diff)
    
                    //Time hehe
                    let hours = (row.points / 300).toFixed(2);
                    ctx.fillStyle = '#00ff00';
                    ctx.fillText(`(${hours} hrs)`, 380, (startY+43) + 45.9 * diff)
    
                    rownum++
                } else {
                    rownum++
                }
            }
            msg.channel.sendFile(canvas.toBuffer())
    
            
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
            console.log(e)
        }
        
    },
    info: {
        aliases: false,
        example: "!top (page number)",
        minarg: 1,
        description: "Displays the monthly server leaderboard",
        category: "Basic",
    }
}