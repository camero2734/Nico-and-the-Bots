module.exports = {
    execute: async function (msg) {
        const { createCanvas, loadImage, Image, registerFont } = Canvas;

        let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
        if (!userEconomy) userEconomy = new Economy(msg.author.id);

        //CALCULATE TIME REMAINING
        let curdate = Date.now();
        var timeremain = (86400000 - (curdate - userEconomy.lastDaily)) / 3600000;
        var hourremain = Math.floor(timeremain);
        var minremain = Math.floor((timeremain - Math.floor(timeremain)) * 60);
        if ((curdate - userEconomy.lastDaily < 86400000) && (msg.author.id !== "221465443297263618") && (msg.author.id !== "335912315494989825")) return msg.channel.embed("You have already received your credits today! You have " + hourremain + " hours and " + minremain + " minutes " + "remaining!");
        

        //DAILY COUNTER
        userEconomy.dailyCount++;
        let dailyCounter = await connection.getRepository(Counter).findOne({ id: msg.author.id, title: "ConsecutiveDaily" });
        if (!dailyCounter) dailyCounter = new Counter(msg.author.id, "ConsecutiveDaily", 0, curdate);
        if (curdate - userEconomy.lastDaily <= 86400000 * 2) {
            dailyCounter.count++;
        } else dailyCounter.count = 1, dailyCounter.lastUpdated = curdate;
        userEconomy.lastDaily = curdate;

        //FIXME: Weekly consecutive bonus
        if (dailyCounter.count % 7 === 0) {
            await msg.channel.embed("**Weekly `!daily` bonus!**\n\nYou've done !daily 7 days in a row, so you've earned 2000 extra credits!");
            userEconomy.credits += 2000;
        }
        console.log("AAAAAAAAAA");
        await connection.manager.save(dailyCounter);

        //DOUBLEDAILY / GIVE CREDITS
        let hasDouble = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "Perk", title: "doubledaily" });
        let creditsToGive = 200;
        let badgeLogo = null;
        if (msg.member.roles.get("332021614256455690")) creditsToGive = 300, badgeLogo = "cf";
        if (hasDouble) creditsToGive *= 2, badgeLogo = "dd";
        userEconomy.credits += creditsToGive;

        //CHANGE BACKGROUND BASED ON ALBUM ROLE
        let album = "default";
        if (msg.member.roles.get(TRENCH)) album = "t";
        else if (msg.member.roles.get(BF)) album = "b";
        else if (msg.member.roles.get(VSL)) album = "v";
        else if (msg.member.roles.get(RAB)) album = "r";
        else if (msg.member.roles.get(ST)) album = "s";
        else if (msg.member.roles.get(NPI)) album = "n";

        //REGISTER FONTS
        registerFont(("./assets/fonts/h.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/NotoEmoji-Regular.ttf"), { family: "futura" }); // eslint-disable-line max-len
        registerFont(("./assets/fonts/a.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/j.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/c.ttf"), { family: "futura" });
        registerFont(("./assets/fonts/br.ttf"), { family: "futura" });

        var img = await loadImage("./albums/" + album + ".png");
        var cf = await loadImage("./badges/cflogo.png");
        var dd = await loadImage("./badges/dd.png");
        var img2 = await loadImage("./albums/" + album + "2.png");

        var canvas = createCanvas(500, 162);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        
        //MAKE TEXT FIT
        let maxWidth = 300;
        let maxHeight = 50;
        let measuredTextWidth = 1000;
        let measuredTextHeight = 1000;
        let checkingSize = 40;
        while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
            checkingSize--;
            ctx.font = checkingSize + "px futura";
            let textInfo = ctx.measureText(msg.member.displayName);
            measuredTextWidth = textInfo.width;
            measuredTextHeight = textInfo.emHeightAscent + textInfo.emHeightDescent;
        }

        //DRAW NAME
        ctx.fillStyle = msg.member.displayHexColor;
        ctx.font = checkingSize + "px futura";
        ctx.fillText(msg.member.displayName, 120, 65);

        //DRAW GOT CREDITS & BADGE
        ctx.fillStyle = "white";
        ctx.font = "40px futura";
        ctx.fillText(`Got ${creditsToGive} credits!`, 120, 120);
        if (badgeLogo === "cf") ctx.drawImage(cf, 408, 91, 30, 30);
        else if (badgeLogo === "dd") ctx.drawImage(dd, 408, 91, 30, 30);
        ctx.drawImage(img2, 30, 44); //ALBUM LOGO
        
        //GIVE BLURRYTOKEN
        let hasTokenInc = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "Perk", title: "blurryboxinc" });
        let bTokensToGive = hasTokenInc ? 2 : 1;

        let before = userEconomy.blurrytokens;
        let after = Math.min(userEconomy.blurrytokens + bTokensToGive, 5); //LIMIT TO 5
        userEconomy.blurrytokens = after;

        let tokenMessage = "None";

        if (after > before && after === 5) { //JUST REACHED 5
            tokenMessage = `You earned **${after - before} token${after - before === 1 ? "" : "s"}**! You have now reached the **maximum number of 5 tokens**, so you should spend them with \`!blurrybox.\``;
        } else if (after === before && after === 5) { //STILL AT 5
            tokenMessage = "**You have the maximum number of tokens, so you did not earn any today!** Spend them with `!blurrybox.`";
        } else { //EARNED SOME
            tokenMessage = `You earned **${after - before} token${after - before === 1 ? "" : "s"}**! You now have **${after} token${after === 1 ? "" : "s"} total**- you can spend ${after === 1 ? "it" : "them"} with \`!blurrybox.\``;
        }
        
        await connection.manager.save(userEconomy);


        let facts = [
            "If you're going to a concert, there are concert channels! Simply say `!concert CityName` to join yours.",
            "You can create a custom profile with `!createprofile`.",
            "If you boost the server with nitro, you can add a custom emoji! Use the `!boostemoji` command.",
            `You can buy color roles from <#${chans.shop}>! To see the colors of the available roles, use the \`!cr\` command.\n\n To view and equip your color roles, say \`!cc\`.`,
            "The `!createtag` command can be used to add a snippet of text that you can later make the bot send with the `!tag` command!",
            `You can submit an interview to <#${chans.interviews}> with the \`!interview\` command.`,
            "Use the `!topfeed` command to get a ping when Tyler or Josh post on social media, as well as when dmaorg.info updates!",
            "You can use the `!commands` command to view a list of commands (sorted into categories).",
            "You can follow us on [Twitter](https://twitter.com/discordclique) or on [Instagram](https://www.instagram.com/discordclique/)!",
            "We have a music bot - <@470705413885788160>! You can use `!play Clear twenty one pilots` to play the best song in existence.",
            `We have theory channels for talking about dmaorg.info/leaks/new stuff! <#${chans.leakstheories}> is available to everyone, and <#${chans.verifiedtheories}> is available to anyone who passes a short quiz!\nUse \`!appeal\` to take the quiz!`,
            `Check out <#${chans.creations}> and <#${chans.bestcreations}> to see user-submitted art!`,
            `Check out <#${chans.positivity}> for cute pets and words of encouragement!`,
            `Check out <#${chans.hiatusmemes}> for era-related memes!`,
            `Check out <#${chans.polls}> to vote on polls created by staff members!`,
            `Head over to <#${chans.suggestions}> to submit a suggestion about the server!`, 
            `Find a message really funny, or a piece of art really amazing? React with :gold: to give them gold! (Costs 1000 credits). \n\nTheir message will show up in <#${chans.houseofgold}>!`,
            "Stream Truce. Now."
        ];

        let randomFact = facts[Math.floor(Math.random() * facts.length)];
        let embed = new Discord.RichEmbed().setColor("RANDOM").setTitle(msg.member.displayName + "'s Daily").setFooter("Have an idea for another server tip? Submit it with !suggest");
        embed.addField("Server Fact", randomFact);
        embed.addField("Blurrytokens Earned", tokenMessage);
        embed.attachFile(new Discord.Attachment(canvas.toBuffer(), "daily.png"));
        embed.setImage("attachment://daily.png");
        await msg.channel.send(embed);
    },
    info: {
        aliases: false,
        example: "!daily",
        minarg: 0,
        description: "Sends a user their daily server credits",
        category: "Basic"
    }
};