module.exports = async function (msg, Discord) {
    const snekfetch = require("snekfetch");
    const cost = 1000;
    if (msg.author.bot) return;
    try {
        //Check for and download attachment as buffer, delete user message
        if (!msg.attachments || msg.attachments.array().length < 1) return msg.delete();
        let url = msg.attachments.first().url;
        let data = (await snekfetch.get(url)).body;
        let channel = "N/A";
        await msg.delete();
        console.log("2");
        //DM user asking to verify / for credits
        let dm = await msg.member.createDM();
        dm.embed("Please confirm that you want to give gold to multiple messages for " + cost + " credits\n*To confirm, please say \"**Give gold**\". If this was an accident, you can safely ignore this message!*");
        const filter = (m => m.author.id === msg.author.id);
        let collected;
        try {
            collected = await dm.awaitMessages(filter, { max: 1, time: 20 * 1000, errors: ["time"] });
        } finally {
            console.log("3");
            let answer = collected ? collected.first().content : null;
            if (!answer || answer.toLowerCase() !== "give gold") return dm.send("Gold was cancelled!");
            let chan_id = await getChannel(dm);
            console.log("4");
            if (chan_id) channel = msg.guild.channels.get(chan_id).id;
            else dm.send("A channel was not added to the gold.");
            console.log(channel, /CHANNEL/);
            let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });
            if (!userEconomy) userEconomy = new Economy(msg.author.id);
            if (userEconomy.credits < cost) return dm.send("Not enough credits!");
            userEconomy.credits-=cost;
            await connection.manager.save(userEconomy);
            await dm.send(`You gave gold! You now have ${newXP} credits`);
        }

        //Create and send embed
        console.log(/CREATING EMBED/);
        let embed = new Discord.RichEmbed();
        embed.addField("Multiple messages have been given gold!", "\u200b");
        embed.setThumbnail("https://i.imgur.com/B3XnMmi.png");
        embed.addField("Given by: ", msg.member.displayName, true);
        console.log("<#" + channel + ">", /WEEEEEE/);
        embed.addField("Channel: ", "yehaw", true);
        let d = msg.createdAt;
        embed.addField("Date: ", d.toDateString() + " " + d.toTimeString().split(" ")[0]);
        embed.setColor("#ffd700");
        let endingPre = url.split("?")[0].split(".");
        let ending = endingPre[endingPre.length - 1];
        embed.attachFile(new Discord.Attachment(data, "attached." + ending));
        embed.setImage("attachment://attached." + ending);
        let m = await msg.channel.send(embed);
        await m.react("%E2%AC%86"); await m.react("%E2%AC%87");

        async function getChannel(dm) {
            return new Promise(async resolve => {
                dm.embed("Please enter either the name of the channel the screenshot is from or the channel id.");
                const f = (m => m.author.id === msg.author.id);
                let c;
                try {
                    c = await dm.awaitMessages(f, { max: 1, time: 20 * 1000, errors: ["time"] });
                } finally {
                    console.log("ended");
                    let a = c ? c.first().content : null;
                    if (!a) resolve(null);
                    for (let ch of msg.guild.channels.array()) {
                        if (ch.name.toLowerCase().replace(/ |-/g, "") === a.toLowerCase().replace(/ |-/g, "")) {
                            console.log("name");
                            resolve(ch.id);
                            return;
                        }
                        if (ch.id === a.toLowerCase().trim()) {
                            console.log("id");
                            resolve(ch.id);
                            return;
                        }

                    }
                    resolve(await getChannel(dm));
                }
            });
        }
    } catch (e) {
        console.log("eeerrrrr");
    }



};