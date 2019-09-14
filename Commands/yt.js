module.exports = {
    execute: async function (msg) {
        let search = require("youtube-search");
 
        var opts = { maxResults: 1, key: process.env.YOUTUBE, type: "video" };
 
        try {
            let results = await search(removeCommand(msg.content), opts);
            if (!results || results.length === 0) throw new Error("No results found");
            let result = results.results[0];
            let r = await got(`https://www.googleapis.com/youtube/v3/videos?id=${result.id}&part=contentDetails,statistics&key=${opts.key}`);
            console.log(JSON.parse(r.body), result.id);
            let info = JSON.parse(r.body).items[0];
            let length = info.contentDetails.duration;
            console.log(length, /INFO/);
            let embed = new Discord.RichEmbed().setColor("RED");
            embed.setTitle(result.title);
            embed.addField("Link", `${result.link}`);
            embed.setImage(result.thumbnails.high.url);

            if (/[0-9]{1,2}[dw]/i.test(length)) { // D days and H hours and M minutes and S seconds
                let timeVals = ["week", "day", "hour", "minute", "second"];
                timeVals = timeVals.map((v) => {
                    let reg = new RegExp(`[0-9]{1,2}(?=${v.substring(0, 1)})`, "i");
                    let value = length.match(reg);
                    if (!value) return "";
                    else return value + ` ${v}${value == 1 ? "" : "s"}`;
                }).filter(v => v !== "");
                console.log(timeVals, /TIMEVALS/);
                embed.addField("Length", timeVals.join(" and "));
            } else { //H:MM:SS or M:SS
                let timeVals = ["hour", "minute", "second"];
                timeVals = timeVals.map((v, i) => {
                    let reg = new RegExp(`[0-9]{1,2}(?=${v.substring(0, 1)})`, "i");
                    let value = length.match(reg);
                    if (!value) return i === 0 ? "" : "00";
                    else return value < 9 ? "0" + value : value;
                }).filter(v => v !== "");
                embed.addField("Length", timeVals.join(":"));
            }

            
            msg.channel.send(embed);
        } catch(e) {
            console.log(e);
            msg.channel.embed("Error in fetching YouTube results");
        }
        
    },
    info: {
        aliases: false,
        example: "!yt nico and the niners music video",
        minarg: 0,
        description: "Sends a link to a youtube video",
        category: "N/A"
    }
};