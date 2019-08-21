module.exports = async function(msg, connection, Discord) {
    const bot = msg.client;
    const chans = Discord.chans;
    return new Promise(async resolve => {
        let delay = 10;
        let xptogive = 2;
        if (msg.content.toLowerCase() === "!updatelt") {
            let gained = await updateTokens(msg, false);
            if (gained <= 0) await msg.channel.embed("You have no unclaimed LT!");
            else await msg.channel.embed(`You gained ${levelTokens} level tokens!`);
        }


        let noxpchans = [chans.lyrics, chans.commands, chans.venting, chans.incallmusic, chans.incall, chans.incallmemes];

        //INITIALIZE XPDELAY
        let preXP = await connection.getRepository(XPDelay).findOne({ id: msg.author.id });
        if (!preXP) {
            let newXP = new XPDelay(msg.author.id, 0, 0);
            await connection.manager.save(newXP);
            preXP = newXP;
        }
        //If it's not time to dispense exp yet
        if (preXP.nextTime > Date.now()) {
            preXP.messageCount++;
            await connection.manager.save(preXP);
        }

        //Set time has passed, give exp
        if ((preXP.nextTime <= Date.now() && noxpchans.indexOf(msg.channel.id) === -1) || msg.content.toLowerCase() === "!score") {
            if (preXP.messageCount <= 50) xptogive = preXP.messageCount; //preXP.messageCount = number of msgs sent during period
            if (preXP.messageCount > 50) xptogive = Math.floor(((-1) * (0.05 * preXP.messageCount - 2.5) * (0.05 * preXP.messageCount - 2.5)) + 50);
            if (xptogive < 1) xptogive = 1;
            let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!userEconomy) {
                userEconomy = new Economy(msg.author.id); //Initalizes everything else to 0
            }
            if (Math.random() > 0.5) {
                userEconomy.credits += 2;
            }
            //ALL TIME
            let currentPoints = userEconomy.alltimeScore + xptogive;
            let rq = 100;
            let totalscore = 0;
            let curLevel = 0;
            while (totalscore < currentPoints) {
                totalscore += rq;
                if (totalscore < currentPoints) {
                    rq = (rq + 21) - (Math.pow(1.001450824, rq));
                    curLevel++;
                }
            }
            if (curLevel > userEconomy.alltimeLevel) {
                //FIXME: perks
                let hasPerk = await connection.getRepository(Item).findOne({ id: msg.author.id, title: "lvlcred", type: "Perk" });
                if (hasPerk) {
                    let randomReward = Math.floor(Math.random() * 1500) + 201;
                    hasPerk = `You gained ${randomReward} credits for leveling up!`;
                    userEconomy.credits += randomReward;
                }
                userEconomy.alltimeLevel = curLevel;
                levelTokens = await updateTokens(msg, true, curLevel);
                let lvlEmbed = new Discord.RichEmbed({ description: `LEVEL UP: You are now level ${curLevel}!` }).setColor("RANDOM");
                if (typeof hasPerk === "string") lvlEmbed.addField("Perk Bonus", hasPerk);
                if (levelTokens > 0) lvlEmbed.addField("Level Tokens", `You gained ${levelTokens} level tokens!`);
                await msg.channel.send(msg.member, { embed: lvlEmbed });
            }
            userEconomy.alltimeScore += xptogive;
            let currentMonthlyPoints = userEconomy.monthlyScore + xptogive;
            let rq2 = 100;
            let totalscore2 = 0;
            let newMonthlyLevel = 0;
            while (totalscore2 < currentMonthlyPoints) {
                totalscore2 += rq2;
                if (totalscore2 < currentMonthlyPoints) {
                    rq2 = (rq2 + 21) - (Math.pow(1.001450824, rq2));
                    newMonthlyLevel++;
                }
            }
            if (newMonthlyLevel > userEconomy.monthlyLevel) {
                userEconomy.monthlyLevel = newMonthlyLevel;
            }
            userEconomy.monthlyScore += xptogive;
            await connection.manager.save(userEconomy);

            preXP.nextTime = Date.now() + delay * 1000 * 60;
            preXP.messageCount = 0;
            await connection.manager.save(preXP);
        }
        resolve();
    });

    async function updateTokens(msg, nosay, currentLevel) {
        if (!currentLevel) {
            let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!userEconomy) return 0;
            currentLevel = userEconomy.alltimeLevel;
        }
        function tokenNum(x) {return Math.floor((0.0001 * x * x) + (0.045 * x) + 1);};
        let gained = 0;
        let preLT = await connection.getRepository(LevelToken).findOne({ id: msg.author.id });
        if (!preLT) {
            let newLT = new LevelToken(msg.author.id, 0, 0);
            await connection.manager.save(newLT);
            preLT = newLT;
        }
        let lastLevel = preLT.lastLevel;
        for (let i = preLT.lastLevel + 1; i <= currentLevel; i++) {
            if (i % 5 === 0) {
                gained += tokenNum(i);
                lastLevel = i;
            }
        }

        if (gained >= 1) {
            preLT.value += gained;
            preLT.lastLevel = lastLevel;
            await connection.manager.save(preLT);
        }
        return gained;
    }
};