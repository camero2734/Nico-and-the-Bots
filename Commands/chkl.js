module.exports = {
    execute: async function (msg) {
        let embed = new Discord.RichEmbed().setColor("RANDOM").setTitle("Server lottery").setFooter(bot.user.username, bot.user.displayAvatarURL);
        let members = await storage.entries();
        let time = await storage.getItem("_time");
        embed.addField("Ends", time ? calculateTime(time) : "Not started");
        embed.addField("Entries", members.length);
        embed.addField("Jackpot", calculateWinnings(members.length));
        msg.channel.send(embed);

        function calculateTime(date) {
            date = parseInt(date) + 1000*3600*24;
            let now = Date.now()
            let diff = date - now
            var delta = Math.abs(diff) / 1000;
            var hours = (Math.floor(delta / 3600) % 24).toString();
            delta -= hours * 3600
            var minutes = (Math.floor(delta/60) % 60).toString();
            if (hours === "0") {
                delta -= minutes * 60
                var seconds = (Math.floor(delta) % 60).toString();
                return (minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"} and ` + seconds + ` second${parseInt(seconds) === 1 ? "" : "s"}`)
            } else return ((parseInt(hours) + ` hour${parseInt(hours) === 1 ? "" : "s"} and ` + Math.floor(parseInt(minutes) + ((Math.floor(delta - minutes * 60) % 60)) / 60) + ` minute${Math.round(parseInt(minutes) + ((Math.floor(delta - minutes * 60) % 60)) / 60) === 1 ? "" : "s"}`))
        }

        function calculateWinnings(num) {
            if (num < 2) return "N/A"
            return 10*Math.floor((564.8148*num + (2318.95205953/num) + 1712.9629)/ 10);
        }

    },
    info: {
        aliases: ["chkl","checklottery","currentlottery"],
        example: "!chkl",
        minarg: 0,
        description: "Lists current lottery amount as well as all the entries",
        category: "Fun",
    }
}