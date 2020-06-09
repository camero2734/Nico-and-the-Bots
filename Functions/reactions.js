module.exports = async function(reaction, user) {
    const bot = user.client;
    const Discord = require("discord.js");
    const myFunctions = require("../functions.js");
    const snekfetch = require("snekfetch");
    const dm = require("./dm");
    const fs = require("fs");
    const loadJsonFile = require("load-json-file");
    const writeJsonFile = require("write-json-file");
    let chans = JSON.parse(fs.readFileSync("channels.json"));
    return new Promise(resolve => {
        var msg = reaction.message;

        //SPOILER DELETE
        if (msg.channel.type === "dm" && !user.bot && msg.author.bot && reaction.emoji.name === "🗑") {
            msg.delete();
        }
        //STRIKES
        if (bot.guilds.get("269657133673349120").members.get(user.id).roles.get("330877657132564480") && reaction.emoji.name === "❌" && reaction.count == 1 && !msg.author.bot && !bot.guilds.get("269657133673349120").members.get(msg.author.id).roles.get("330877657132564480")) {
            (async function() {
                let strikes = await loadJsonFile("strikes.json");
                if (!strikes[msg.author.id]) strikes[msg.author.id] = {};
                if (!strikes[msg.author.id][msg.channel.id]) strikes[msg.author.id][msg.channel.id] = { count: -1, time: 0 };
                strikes[msg.author.id][msg.channel.id].count++;
                await writeJsonFile("strikes.json", strikes);
                resolve({ obj: strikes, type: "strike" });
            })();
        }

        //SPOILERS
        if (msg.embeds && msg.embeds.length >= 1) {
            if (msg.embeds && msg.embeds[0] && msg.embeds[0].title && msg.embeds[0].title.startsWith("Spoiler from") && reaction.emoji.name === "👀") {
                (async function() {
                    let spoilers = await loadJsonFile("spoilers.json");
                    if (spoilers[msg.embeds[0].footer.text]) {
                        user.createDM().then(async (c) => {
                            let text;
                            if (spoilers[msg.embeds[0].footer.text].text) text = await c.send("**Spoiler:**\n" + spoilers[msg.embeds[0].footer.text].text);
                            if (text) text.react("🗑");
                            if (spoilers[msg.embeds[0].footer.text].images) {
                                let image = (await snekfetch.get(spoilers[msg.embeds[0].footer.text].images));
                                let buffer = new Buffer.from(image.body);
                                let endingArr = spoilers[msg.embeds[0].footer.text].images.split(".");
                                let ending = endingArr[endingArr.length - 1];
                                c.send("**Spoiler:**", { file: new Discord.Attachment(buffer, "spoiler." + ending) }).then((k) => k.react("🗑"));
                            }
                        });
                    }
                    resolve();
                    return;
                })();
            }
        }

        if (msg.channel.id === chans.houseofgold) {
            console.log("downvotey in houseofgoldy");
            (async function() {
                let emoji1 = 0;
                let emoji2 = msg.reactions.get("⬇");
                if (emoji2) {
                    console.log(emoji2, /EMOJI2/);
                    emoji2 = (await emoji2.fetchUsers()).array().length;
                    if (emoji2 >= 5) resolve({ obj: [emoji1, emoji2], type: "updownvote" });
                }
            })();
        }

        //REPOST
        if (msg.channel.id === chans.trenchmemes) {
            let reactions = msg.reactions.array();
            for (let r of reactions) {
                if (r.emoji.name === "🔁" && r.count > 4) {
                    console.log("going to delete...");
                    resolve({ obj: [r.count], type: "repost" });
                }
            }
            resolve();
            return;
        }

        //GOLD
        if (reaction.emoji.id === "389216023141941249") {
            if (user.id === reaction.message.author.id) return reaction.remove(user);
            let cost = 5000; //credits
            let time = Date.now();
            user.createDM().then(DMCHannel => {
                let alreadyGave = false;
                DMCHannel.send("Please confirm that you want to give gold to " + reaction.message.author.username + " for " + cost + " credits\n*To confirm, please say \"**Give gold**\". If this was an accident, you can safely ignore this message!*").then((me) => {
                    let interval = setInterval(() => {
                        DMCHannel.fetchMessages({ limt: 5, after: me.id }).then((datums) => {
                            let data = datums.array();
                            for (let i in data) {
                                if (data[i].author.id === user.id && data[i].content.toLowerCase() === "give gold" && !alreadyGave) {
                                    clearInterval(interval);
                                    alreadyGave = true;
                                    DMCHannel.send("You gave gold!");
                                    return sendGold();
                                }
                            }
                        });
                        if (Date.now() - time > 30 * 1000) {
                            clearInterval(interval);
                            DMCHannel.send("Gold was cancelled!");
                            reaction.remove(user);
                        }
                    }, 1000);

                });

            });


            async function sendGold() {
                let id = user.id;
                let userEconomy = await connection.getRepository(Economy).findOne({ id: id });
                if (!userEconomy) userEconomy = new Economy({ id });

                if (userEconomy.credits < cost) {
                    await reaction.remove(user);
                    let dm = await user.createDM();
                    await dm.send("`Giving gold costs " + cost + " credits!`");
                    resolve();
                } else {
                    userEconomy.credits -= cost;
                    await connection.manager.save(userEconomy);
                    let _m = reaction.message;
                    let embed = new Discord.RichEmbed();
                    embed.addField(reaction.message.author.username + " has been given gold!", "\u200b");
                    embed.setThumbnail(reaction.message.author.avatarURL);
                    embed.addField("Given by: ", reaction.message.guild.members.get(user.id).displayName, true);
                    embed.addField("Channel: ", "<#" + reaction.message.channel.id + ">", true);
                    let d = reaction.message.createdAt;
                    embed.addField("Date: ", d.toDateString() + " " + d.toTimeString().split(" ")[0]);
                    if (reaction.message.content && reaction.message.content.length > 0) {
                        embed.addField("Message:", reaction.message.content.substring(0, 1000), true);
                    }
                    embed.addField("Link", `[Click Here](https://discordapp.com/channels/${_m.guild.id}/${_m.channel.id}/${_m.id})`);
                    embed.setColor("#ffd700");
                    let arr = reaction.message.attachments.array();
                    if (arr.length > 0) {
                        if (arr[0].url.endsWith(".jpg") || arr[0].url.endsWith(".png")) embed.setImage(arr[0].url);
                        else {
                            let r = await snekfetch.get(arr[0].url);
                            let endingPre = arr[0].url.split("?")[0].split(".");
                            let ending = endingPre[endingPre.length - 1];
                            embed = { embed: embed, file: new Discord.Attachment(r.body, "gold." + ending) };
                        }
                    }

                    resolve({ obj: embed, type: "gold" });
                }
            }

        }
    });
};

//VERIFIED THEORIES CODE
// if (msg.channel.id === chans.appeals && msg.guild.members.get(user.id).roles.get('330877657132564480')) {
//     if (msg.embeds && msg.embeds[0]) {
//         let em = msg.embeds[0]
//         if (em.author.name) {
//             let idName = em.author.name.split(" ")
//             let user = msg.guild.members.get(idName[idName.length - 1])
//             if (user && reaction.emoji.name === '✅') {
//                 user.user.createDM().then((chan) => {
//                     chan.send("Your appeal was approved! You can now access #verified-theories!")
//                 })
//                 user.addRole('475388751711830066')
//             }
//             if (user && reaction.emoji.name === '❌') {
//                 user.user.createDM().then((chan) => {
//                     chan.send("Your appeal was denied for answering a question incorrectly. Please wait a while before submitting another appeal and read the resources channel to catch up.")
//                 })
//             }
//         }
//     }
// }
