module.exports = {
    execute: async function (msg) {
        const { Bing } = require('images-scraper-safe');
        const bing = new Bing();

        let keyword = removeCommand(msg.content);
        let results = await bing.list({ keyword, num: 1 });
        console.log(results, /results/)
        let result = results?.[0];

        if (!result) return msg.channel.embed("Your search returned no results");

        let { url, width, height, format, size } = result;

        let embed = new Discord.RichEmbed();
        embed.setAuthor(keyword, "https://cdn2.iconfinder.com/data/icons/social-icons-color/512/bing-512.png", url);
        embed.setImage(url);
        embed.setFooter(`${width}x${height} (${size} ${format})`);

        await msg.channel.send(embed);

        // Discord.TextChannel.prototype.awaitMessage = async function(member, filter_in) {
        //     return new Promise(resolve => {
        //         let filter = (m) => {return m.author.id === member.id};
        //         if (filter_in) filter = filter_in;
        //         this.awaitMessages(filter, { max: 1, time: 10000, errors: ['time'] })
        //             .then(collected => resolve(collected.first()))
        //             .catch(() => resolve(null));
        //     })
        // }
        //
        // let disallowedWords = chans.nsfwWords;
        // let nsfwText = false;
        // for (let word of disallowedWords) {
        //     if (!nsfwText) {
        //         if (msg.content.toLowerCase().indexOf(word.toLowerCase()) !== -1) nsfwText = true;
        //     }
        // }
        // let bot_id = "470410168186699788";
        // if (msg.content.startsWith("$")) bot_id = "470691679712706570";
        // let botMsg = await msg.channel.awaitMessage(msg.guild.members.get(bot_id));
        // if (!botMsg) return;
        // if (nsfwText) botMsg.delete().then(() => botMsg.channel.embed("You used an inappropriate search term."));
    },
    info: {
        aliases: false,
        example: "!image kitty",
        minarg: 0,
        description: "Sends an image from google",
        category: "N/A",
    }
}
