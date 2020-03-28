module.exports = async function(msg, connection, Discord) {
    const bot = msg.client;
    const { chans } = Discord;
    const { disallowedChannels, disallowedCategories } = msg;
    return new Promise(async resolve => {
        // Verify user is in valid channel
        // if (disallowedChannels.indexOf(msg.channel.id) !== -1 || disallowedCategories.indexOf(msg.channel.parentID) !== -1) return;

        // Constants
        const DELAY = 10; // In minutes

        // updatelt command
        if (msg.content.toLowerCase() === "!updatelt") {
            if (msg.author.id === "221465443297263618") {
                let preXP = await connection.getRepository(XPDelay).findOne({ id: msg.author.id });
                console.log(preXP.nextTime, /NEXTPREXP/)
                await msg.channel.embed(((preXP.nextTime + DELAY * 60 * 1000) - Date.now()) / 60000 + " minutes");
            }
            let gained = await updateTokens(msg, false);
            if (gained <= 0) await msg.channel.embed("You have no unclaimed LT!");
            else await msg.channel.embed(`You gained ${levelTokens} level tokens!`);
        }

        // Initialize XPDelay if user doesn't have one
        let preXP = await connection.getRepository(XPDelay).findOne({ id: msg.author.id });
        if (!preXP) {
            let newXP = new XPDelay(msg.author.id, 0, 0);
            await connection.manager.save(newXP);
            preXP = newXP;
        }

        // If it's not time to dispense exp yet
        if (preXP.nextTime > Date.now() - DELAY * 60 * 1000) {
            preXP.messageCount++;
            await connection.manager.save(preXP);
        }
        // XP time
        else {
            // Calculate multiplier for XP
            let embed = new Discord.RichEmbed().setTitle("Results");
            let description = "";
            let { all, multipliers } = await getMultipliers(); // all = {user_id, channel_id, message_id, time}
            let userMessages = all.filter(a => a.user_id === msg.author.id && a.time >= preXP.nextTime);

            let messageCount = userMessages.length;
            let sum = 0;

            let spamValue = (x) => {
                if (x < 50) return 1;
                else return Math.max(0, (200 - x) / 150);
            }

            for (let i = 0; i < userMessages.length; i++) {
                if (multipliers[userMessages[i].channel_id] === 0) continue;
                sum += spamValue(i + 1) * multipliers[userMessages[i].channel_id];
                let channelName = msg.guild.channels.get(userMessages[i].channel_id) ? msg.guild.channels.get(userMessages[i].channel_id).name : "None";
                description += `${i + 1}. ${Math.round(spamValue(i + 1) * 100) / 100} * ${Math.round(100 * multipliers[userMessages[i].channel_id]) / 100} (#${channelName})\n`;
            }

            embed.setDescription(description.substring(0, 1800) + "\nSUM: " + sum);
            if (msg.author.id === "221465443297263618") {
                console.log("sending DM to poot");
                let dm = await msg.member.createDM();
                dm.send(embed);
            }

            let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!userEconomy) {
                userEconomy = new Economy(msg.author.id); //Initalizes everything else to 0
            }
            if (Math.random() > 0.5) {
                userEconomy.credits += 2;
            }

            /*
                LEVEL CALCULATION
            */

            // Alltime level
            let currentPoints = userEconomy.alltimeScore + sum;
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
            userEconomy.alltimeScore = Math.floor(sum + userEconomy.alltimeScore);

            // Monthly level
            let currentMonthlyPoints = userEconomy.monthlyScore + sum;
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
            userEconomy.monthlyScore = Math.floor(sum + userEconomy.monthlyScore);
            await connection.manager.save(userEconomy);

            preXP.nextTime = Date.now();
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

    async function getMultipliers(chanList) {
        let TIME = 1440; // In minutes

        let all = await connection.getRepository(MessageLog).find({time: typeorm.MoreThan(Date.now() - TIME * 60 * 1000)});
        let channels = {};

        // Calculate totals for each channel
        for (let m of all) {
            if (!channels[m.channel_id]) channels[m.channel_id] = 0;
            channels[m.channel_id]++;
        }

        // Default chanList
        if (!chanList || chanList.length === 0) chanList = Object.keys(channels);

        // Find largest and smallest values
        let max_val = 0;
        let min_val = Infinity;
        let avg = 0;
        let count = 0;
        for (let c in channels) {
            try {
                let chan = msg.guild.channels.get(c);
                if (disallowedChannels.indexOf(chan.id) !== -1 || disallowedCategories.indexOf(chan.parentID) !== -1) {
                    channels[c] = -1; // Disallowed channel
                    continue;
                }
            } catch (e) {
                continue;
            }

            max_val = Math.max(max_val, channels[c]);
            min_val = Math.min(min_val, channels[c]);
            avg += channels[c];
            count++;
        }
        avg = (avg - max_val) / (count - 1);

        // Calculate pts multiplier for each channel
        const MAX_MULT = 1.5;
        const MIN_MULT = 0.5;
        const POWER = 4;
        let embed = new Discord.RichEmbed().setTitle("Message Log Results");

        let multipliers = {};
        for (let c of chanList) {
            if (channels[c] === -1) {
                multipliers[c] = 0;
                continue;
            }
            try {
                let multiplier = 1;
                if (channels[c] <= avg) { // (min_val, MAX), (avg, 1)
                    multiplier = 1 + (MAX_MULT - 1) * Math.pow((channels[c] - min_val) / (min_val - avg) + 1, POWER);
                } else { // (avg, 1), (max_val, MIN)
                    multiplier = MIN_MULT + (1 - MIN_MULT) * Math.pow((channels[c] - avg) / (avg - max_val) + 1, POWER);
                }
                multipliers[c] = multiplier;
            } catch(e) {
                console.log(e);
                multipliers[c] = 0;
            }
        }

        return { all, multipliers };
    }
};
