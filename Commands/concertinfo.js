module.exports = {
    execute: async function (msg, args) {
        if (!args || !args[1]) return msg.channel.embed("Invalid concert!")
        let name = msg.removeCommand(msg.content); name = name.replace(/ /g, '%20')
        var seatgeek = require("seatgeek");
        seatgeek(name).then((details) => {
            let date = details.events[0].datetime_utc
            let date_split = date.split("T")
            let concertDate = new Date(date_split[0] + " " + date_split[1] + " UTC")
            msg.channel.send(concertDate.toString())
            if (!details.events) return msg.channel.embed("Invalid concert!")
            details = details.events[0]
            if (!details || !details.id) return msg.channel.embed("Invalid concert!")
            let embed = new Discord.RichEmbed()
            embed.setAuthor(details.title, details.performers[0].image)
            embed.addField("Venue:", details.venue.name + ' in ' + details.venue["display_location"])
            embed.addField("Lowest ticket price:", details.stats['lowest_price'])
            embed.addField("Highest ticket price:", details.stats['highest_price'])
            embed.addField("Average ticket price:", details.stats['average_price'])
            embed.addField("Number of tickets for sale:", details.stats['listing_count'])
            embed.addField("Popularity [0-100]:", details.popularity * 100)
            embed.addField("Cheapest GA Ticket:", details.gaprice)
            embed.addField("Link:", details.url)
            embed.setFooter("ALL PRICES INCLUDE FEES", bot.user.displayAvatarURL)
            msg.channel.send({ embed: embed })
        }).catch(err => { msg.channel.embed("Invalid concert!") })
    },
    info: {
        aliases: false,
        example: "!concertinfo [concert id]",
        minarg: 2,
        description: "Gets some information about a concert from SeatGeek",
        category: "N/A",
    }
}