module.exports = function(guild, sql) {
    const TO = '278225702455738368';
    const storage = require('node-persist');
    const shuffle = require('./shuffle');
    const fs = require("fs");
    const chans = JSON.parse(fs.readFileSync('channels.json'));
    const bot = guild.client;
    setInterval(async () => {
        var guild = bot.guilds.get('269657133673349120')
        var d = new Date();
        let rows = await sql.all(`SELECT * FROM remind`)
        for (let row of rows) {
            let t1 = row.time;
            let t2 = Date.now();
            
            if (t1 <= t2) {
                let user = bot.users.get(row.userID)
                if (!user) {
                    await sql.run(`DELETE FROM remind WHERE userID = "${row.userID}" AND time = "${row.time}"`)
                }
                user.createDM().then(DMCHannel => {
                    DMCHannel.send("REMINDER: You are being reminded that you said the following: **" + row.txt + "**")
                    sql.run(`DELETE FROM remind WHERE userID = "${row.userID}" AND time = "${row.time}"`)
                })
            }
        }

        let trows = await sql.all(`SELECT * FROM timeout`)
        let found = false;
        for (let row of trows) {
            let t1 = row.time;
            let t2 = Date.now();
            let log = false;
            if (row.userid.toString() === "335912315494989825") found = true;
           
            if (t1 < t2) {
                try {
                    let RoleMember = guild.members.get(row.userid);
                    if (!RoleMember) {
                        await sql.run(`DELETE FROM timeout WHERE userid="${row.userid}"`);
                    } else {
                        await RoleMember.removeRole(TO);
                        RoleMember.addRole('269660541738418176');
                        var user = RoleMember.user;
                        let dm = await user.createDM();
                        sql.get(`DELETE FROM timeout WHERE userid = "${row.userid}"`);
                        await dm.send('You are no longer muted!');
                        
                    } 
                } catch(e) {
                    console.log(e)
                }
                
            }
        }
    }, 10000)
}