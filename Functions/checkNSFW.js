module.exports = async function(msg, reply, nsfai) {
    const fs = require("fs");
    let snekfetch = require("snekfetch")
    const chans = JSON.parse(fs.readFileSync('channels.json'));
    const myFunctions = require('../functions.js');
    const Discord = require("discord.js");
    Discord.Channel.prototype.embed = require("./embed");
    return new Promise(resolve => {
        if (!msg || !msg.member) resolve(true)
        //if (((msg.member.roles.get("330877657132564480") && !reply))) resolve(true)
        else if (msg.author.bot) resolve(true)
        else if (msg.attachments.size > 0 && msg.attachments.first()) {
            let url = msg.attachments.first().url
            predict(url)
        } 
        else {
            if (msg.embeds && msg.embeds.length > 0) {
                let hadValidEmbed = false;
                for (let embed of msg.embeds) {
                    if (embed.type === 'image' || embed.type === 'gifv') {
                        predict(embed.url)
                    } 
                }
                if (!hadValidEmbed) resolve(true);
            } else resolve(true)
        }
        function predict(url) {
            nsfai.predict(url).then(async (result) => {
                if (!result.sfw && result.confidence < 0.65) result.sfw = true, result.confidence = 1 - result.confidence
            if (result.sfw) {
                    if (reply) msg.channel.embed(`Image is sfw with confidence of ${result.confidence}`)
                    //else consoneLog(`Image is sfw with confidence of ${result.confidence}`)
                    resolve(true)
                } else {
                    if (reply) {
                        msg.channel.embed(`Image is nsfw with confidence of ${result.confidence}`)
                        resolve(true)
                    } else {
                        let chan = msg.guild.channels.get(chans.slurlog);
                        let conf = 'NSFW image detected with confidence ' + result.confidence;
                        let color = 16711680;
                        let endingPre = url.split("?")[0].split(".")
                        let ending = endingPre[endingPre.length - 1]
                        
                        let r = await snekfetch.get(url)
                        let embed = new Discord.RichEmbed()
                            .setTitle(conf)
                            .setAuthor(msg.member.displayName, msg.author.displayAvatarURL)
                            .addField("Channel:", msg.channel.name)
                            .addField("Created at:", msg.createdAt)
                            .setImage("attachment://")
                            .attachFile({ attachment: r.body, name: "nsfw." + ending})
                            .setImage("attachment://" + "nsfw." + ending)
                            .setColor(color)
                        console.log("nsfw detected3")
                        chan.send(embed)
                        msg.delete()
                        msg.channel.embed(`This image is NSFW. Please refrain from sending such images.`);
                        resolve(false)
                    }
                }
            }).catch(err => {
                console.log("error in nsfai")
                if (err && err.data && err.data.status && err.data.status.code === "11006") resolve("error");
                else resolve(true);
            })
        }
    })
}