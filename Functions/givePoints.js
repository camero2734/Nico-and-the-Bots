module.exports = async function(msg, xpdelay, sql, leveltokens) {
    const bot = msg.client;
    const Discord = require("discord.js");
    const fs = require("fs");
    const loadJsonFile = require("load-json-file");
    const writeJsonFile = require("write-json-file");
    const chans = JSON.parse(fs.readFileSync("channels.json"));
    const myFunctions = require("../functions.js");
    return new Promise(async resolve => {
        let delay = 10;
        let xptogive = 2;

        if (msg.content.toLowerCase() === "!updatelt") {
            let row = await sql.get(`SELECT * FROM scores2 WHERE userId ="${msg.author.id}"`);
            if (row) levelTokens = updateTokens(row.level, msg, false);
        }


        let noxpchans = [chans.lyrics, chans.commands, chans.venting, chans.incallmusic, chans.incall, chans.incallmemes];

        //INITIALIZE THAT STUFF
        if (!xpdelay[msg.author.id]) {xpdelay[msg.author.id] = {time: 0, num: 0}; await writeJsonFile('roasted.json', xpdelay)}
        if (!xpdelay[msg.author.id].time) xpdelay[msg.author.id].time = 0

        //If it's not time to dispense exp yet
        if (xpdelay[msg.author.id].time > Date.now()) {
            if (!xpdelay[msg.author.id].num) xpdelay[msg.author.id].num = 0;
            xpdelay[msg.author.id].num++;
        }

        //Set time has passed, give exp
        if ((xpdelay[msg.author.id].time <= Date.now() || msg.content.toLowerCase() === "!score") && noxpchans.indexOf(msg.channel.id) === -1) {
            if (xpdelay[msg.author.id].num) {
                if (xpdelay[msg.author.id].num <= 50) xptogive = xpdelay[msg.author.id].num //xpdelay[msg.author.id].num = number of msgs sent during period
                if (xpdelay[msg.author.id].num > 50) xptogive = ~~(((-1) * (0.05 * xpdelay[msg.author.id].num - 2.5) * (0.05 * xpdelay[msg.author.id].num - 2.5)) + 50)
                if (xptogive < 1) xptogive = 1
            }
            if (Math.random() > 0.5) {
                myFunctions.credits(msg, 2, false, false, false, false, true)
            }

            let row = await sql.get(`SELECT * FROM scores2 WHERE userId ="${msg.author.id}"`)
            if (!row) {
                await sql.run("INSERT INTO scores2 (userId, points, level) VALUES (?, ?, ?)", [msg.author.id, 1, 0]);
                row = await sql.get(`SELECT * FROM scores2 WHERE userId ="${msg.author.id}"`)
            }
            let currentPoints = row.points + xptogive;
            let rq = 100
            let totalscore = 0
            let curLevel = 0
            while (totalscore < currentPoints) {
                totalscore += rq
                if (totalscore < currentPoints) {
                    rq = (rq + 21) - (Math.pow(1.001450824, rq))
                    curLevel++
                }
            }
            if (curLevel > row.level) {
                let perkrow = await sql.get(`SELECT * FROM perks WHERE userId ="${msg.author.id}"`)
                if (perkrow && perkrow['lvlcred'] && parseInt(perkrow['lvlcred']) === 1) {
                    let randomReward = ~~(Math.random() * 1500) + 201
                    msg.channel.send(`**Perk Bonus:** You gained ${randomReward} points for leveling up!`)
                    let temprow = await sql.get(`SELECT * FROM daily WHERE userId ="${msg.author.id}"`)
                    if (temprow && temprow.xp) await sql.run(`UPDATE daily SET xp ="${temprow.xp + randomReward}" WHERE userId ="${msg.author.id}"`)

                }
                row.level = curLevel;
                levelTokens = updateTokens(row.level, msg, true)
                await sql.run(`UPDATE scores2 SET points = ${Math.floor(row.points + xptogive)}, level = ${row.level} WHERE userId = ${msg.author.id}`);
                msg.channel.send(msg.member, {embed: new Discord.RichEmbed({description: `LEVEL UP: You are now level ${curLevel}!`}).setColor("RANDOM")});
            }
            await sql.run(`UPDATE scores2 SET points = ${Math.floor(row.points + xptogive)} WHERE userId = ${msg.author.id}`);
    
            let row2 = await sql.get(`SELECT * FROM scores WHERE userId ="${msg.author.id}"`)
            if (!row2) {
                await sql.run("INSERT INTO scores (userId, points, level) VALUES (?, ?, ?)", [msg.author.id, 1, 0]);
            } else {
                let currentPoints = row2.points + xptogive
                let rq2 = 100
                let totalscore2 = 0
                let curLevel2 = 0
                while (totalscore2 < currentPoints) {
                    totalscore2 += rq2
                    if (totalscore2 < currentPoints) {
                        rq2 = (rq2 + 21) - (Math.pow(1.001450824, rq2))
                        curLevel2++
                    }
                }

                if (curLevel2 > row2.level) {
                    row2.level = curLevel2;
                    await sql.run(`UPDATE scores SET points = ${Math.floor(row2.points + xptogive)}, level = ${row2.level} WHERE userId = ${msg.author.id}`);
                }
                await sql.run(`UPDATE scores SET points = ${Math.floor(row2.points + xptogive)} WHERE userId = ${msg.author.id}`);
            }
            xpdelay[msg.author.id].time = Date.now() + delay * 1000 * 60
            xpdelay[msg.author.id].num = 0
            
        }
        resolve({delay: xpdelay, tokens: leveltokens})
    })

    function updateTokens(cL, msg, nosay) {
        function tokenNum(x) {return Math.floor((0.0001 * x * x) + (0.045 * x) + 1)};
        let id = msg.author.id
        if (!leveltokens[id]) leveltokens[id] = {}
        if (!leveltokens[id]['tokens']) leveltokens[id]['tokens'] = 0
        let gained = 0
        for (let i = 5; i <= cL; i += 5) {
            if (!leveltokens[id][i]) {
                leveltokens[id]['tokens'] += tokenNum(i)
                gained += tokenNum(i)
                leveltokens[id][i] = 1
            }
        }
        if (gained >= 1) {
            msg.channel.send(`You gained ${gained} LT!`)
        } else {
            if (!nosay) {
                msg.channel.send('You don\'t have any tokens to claim, but you earn LT every 5 levels!')
            }
        }
        return leveltokens;
    }
}