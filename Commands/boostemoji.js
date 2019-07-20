module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("585527743324880897")) return msg.channel.embed("You must be a server nitro booster to use this command!");
        let args = msg.content.split(" ");
        let name = args[1];
        let url = args[2] ? args[2] : (msg.attachments && msg.attachments.first() && msg.attachments.first().url);
        if (!url || !name) return msg.channel.embed("You must provide a url or upload an image!\n\n**!boostemoji EmojiName http://www.website.com/image.png**");

        let hasEmoji = null;

        if (boostEmojiJSON[msg.author.id]) {
            if (msg.guild.emojis.get(boostEmojiJSON[msg.author.id])) {
                let curEmoji = msg.guild.emojis.get(boostEmojiJSON[msg.author.id]);
                let embed = new Discord.RichEmbed().setColor("RANDOM").setDescription(`You already have an emoji. Are you sure you want to replace :${curEmoji.name}:?`);
                embed.setThumbnail(curEmoji.url);
                await msg.channel.send(embed);
                let cur_response = await msg.channel.awaitMessage(msg.member);
                if (cur_response.content.trim().toLowerCase() !== "yes") return msg.channel.embed("Cancelled emoji creation.");
                hasEmoji = curEmoji;
            }
            else {
                delete boostEmojiJSON[msg.author.id];
                await writeJsonFile("./json/boostemoji.json", boostEmojiJSON);
            }
        }

        try {
            let endingArr = url.split(".");
            let ending = endingArr[endingArr.length - 1].split("?")[0].toLowerCase();
            if (ending !== "png" && ending !== "jpg" && ending !== "jpeg" && ending !== "gif") throw new Error("Invalid URL/upload!");
            let r = await snekfetch.get(url);
            let boost_attach = new Discord.Attachment(r.body, "b_" + name + "." + ending);

            let embed = new Discord.RichEmbed().setColor("RANDOM").setDescription(`Do you want to add the emoji :b_${name}:?`);
            embed.attachFile(boost_attach);
            embed.setThumbnail("attachment://" + "b_" + name + "." + ending);
            await msg.channel.send(embed);
            let response = await msg.channel.awaitMessage(msg.member);
            if (response.content.trim().toLowerCase() !== "yes") return msg.channel.embed("Cancelled emoji creation.");
            if (hasEmoji) await msg.guild.deleteEmoji(hasEmoji);
            let emoji = await msg.guild.createEmoji(r.body, "b_" + name);
            
            boostEmojiJSON[msg.author.id] = emoji.id;
            await writeJsonFile("./json/boostemoji.json", boostEmojiJSON);

            await msg.channel.send(`Your emoji ${emoji} has been created!`);
        } catch(e) {
            console.log(e, /BOOSTEMOJIERR/);
            let messArgs = e.message.split(":");
            return msg.channel.embed(messArgs[messArgs.length - 1]);
        }
        
    },
    info: {
        aliases: false,
        example: "!boostemoji [Emoji Name] [Link OR Upload]",
        minarg: 1,
        description: "If you are a server booster, you can set one emoji to your choosing! You can either havee a static or animated emoji.",
        category: "Other",
    }
}