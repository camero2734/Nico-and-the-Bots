module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed("This command is dead :D");
        let apiURL = "https://api.songkick.com/api/3.0/artists/3123851/calendar.json?apikey=heMLjOnXj1zuWDXP";
        let page = msg.args && msg.args[1] && !isNaN(msg.args[1]) && msg.args[1] > 0 ? Math.floor(msg.args[1]) - 1 : 0;
        try {
            let r = await snekfetch.get(apiURL);
            let init_json = r.body.resultsPage.results.event;
            let embed = new Discord.RichEmbed();

            let json = [];
            let previousDate = null;
            let previousCity = null;
            let previousSeries = null;
            for (let concert of init_json) if (concert && concert.venue && concert.venue.displayName && (concert.start.date !== previousDate) || (concert.location.city !== previousCity && (!concert.series || (concert.series.displayName.indexOf(previousSeries) === -1 && previousSeries.indexOf(concert.series.displayName) === -1)))) {
                if (concert.venue.displayName === "Unknown venue" && concert.series) {
                    concert.venue.displayName = concert.series.displayName;
                }
                json.push(concert);
                previousDate = concert.start.date;
                previousCity = concert.location.city;
                previousSeries = concert.series ? concert.series.displayName : previousSeries;
            }

            for (let i = page * 10; i < page * 10 + 10; i++) {
                let concert = json.length > i ? json[i] : undefined;
                if (!concert) continue;
                let title = `#${i+1}: ${concert.venue.displayName} - ${concert.location.city.split(",")[0]}, ${concert.location.city.split(",")[1].trim()}`;
                let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                let startDate = new Date(concert.start.date + " 00:00:00");
                let endDate = concert.end ? new Date(concert.end.date + " 00:00:00") : undefined;

                let field = `${months[startDate.getMonth()]} ${startDate.getDate()}`;
                if (endDate) field+=`-${months[endDate.getMonth()]} ${endDate.getDate()}`;
                embed.addField(title, field);
            }
            await msg.channel.send(embed);
        } catch(e) {
            console.log(e, /CL_ERR/)
            return msg.channel.embed("Error in fetching list.");
        }
        

    }
,
    info: {
        aliases: false,
        example: "!concertlist",
        minarg: 0,
        description: "Lists concerts by popularity",
        category: "Other",
    }
}