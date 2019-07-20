module.exports = {
    execute: async function (msg) {
        const tz = require('timezone-id');
        const { DateTime } = require("luxon");
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You cannot use this command");
        
        let embed = new Discord.RichEmbed().setColor("RANDOM");

        let m = await msg.channel.send(new Discord.RichEmbed().setDescription("Event name? If it's a gaming event, please enter the name of the game.").setColor("RANDOM"));
        let eventName = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!eventName) return msg.channel.embed("Event not scheduled. Use !event again to restart.");

        await m.edit(new Discord.RichEmbed().setDescription("Event platform?").setColor("RANDOM"));
        let platformName = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!platformName) return msg.channel.embed("Event not scheduled. Use !event again to restart.");
        
        await m.edit(new Discord.RichEmbed().setDescription("Event description?").setColor("RANDOM"));
        let description = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!description) return msg.channel.embed("Event not scheduled. Use !event again to restart.");
        
        await m.edit(new Discord.RichEmbed().setDescription("Event thumbnail (the small one)? Please insert a LINK to the image. If you don't want to add a thumbnail, just say NA.").setColor("RANDOM"));
        let thumbnailLink = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!thumbnailLink) return msg.channel.embed("Event not scheduled. Use !event again to restart.");
        
        await m.edit(new Discord.RichEmbed().setDescription("Event image (the big one)? Please insert a LINK to the image. If you don't want to add an image, just say NA.").setColor("RANDOM"));
        let imageLink = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!imageLink) return msg.channel.embed("Event not scheduled. Use !event again to restart.");

        await m.edit(new Discord.RichEmbed().setDescription("Event time? Please enter in the following format: `hh:mm dd/mm/yyyy City`.\n`City` should be the name of a city in the target timezone.\n\n For example, `20:30 04/07/2019 Chicago` would schedule the event for 8:30PM (Central Time) on July 4th 2019").setColor("RANDOM"));
        let eventTime = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
        if (!eventTime) return msg.channel.embed("Event not scheduled. Use !event again to restart.");

        await m.delete();

        let waiting = await msg.channel.send(new Discord.RichEmbed().setDescription("Please wait, parsing time information...").setColor("RANDOM"));

        try {
            embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL);
            embed.setTitle(eventName);
            embed.setDescription(description);
            embed.addField("Platform:", platformName);
            if (thumbnailLink && thumbnailLink !== "NA") embed.setThumbnail(thumbnailLink);
            if (imageLink && imageLink !== "NA") embed.setImage(imageLink);
    
    
            let timeParts = eventTime.split(" ");
            if (timeParts.length < 3) return msg.channel.embed("Invalid date/time entered. Use !event again to restart.");
            let timezone = await tz.getTimeZone(timeParts.slice(2, 1000).join(" "));
    
            var zone = DateTime.fromFormat(
                `${timeParts[0]} ${timeParts[1]} ${timezone}`,
                "HH:mm dd/MM/yyyy z"
            );
            
            let timezones = [{a: "PT", c: "Los Angeles"}, {a: "CT", c: "Chicago"}, {a: "ET", c: "New York"}, {a: "UTC", c: "Abidjan"}, {a: "BST", c: "London"}, {a: "CEST", c: "Paris"}, {a: "AEST", c: "Canberra"}];
            let timeString = "";
            for (let t of timezones) {
                let ts = zone.setZone((await tz.getTimeZone(t.c))).toLocaleString(DateTime.DATETIME_FULL).split(" ");
                ts = ts.slice(0, 5);
                timeString += `**${t.a}:** ${ts.join(" ")}\n`;
            }
    
            embed.addField("Times:", timeString);
            embed.setFooter(zone.toMillis() + " || Click 📅 to receive reminders for this event!")
            await waiting.delete();
            await msg.channel.send(embed);
            let m2 = await msg.channel.embed("Would you like to schedule this event?");
            let toSend = (await msg.channel.awaitMessage(msg.member, false, 180000, true)).content;
            await m2.delete();
    
            if (toSend.toLowerCase() === "yes") {
                let m3 = await msg.guild.channels.get(chans.events).send(embed);
                await m3.react("📅");
                await msg.channel.embed(`Event scheduled! <#${chans.events}>`);
            } else msg.channel.embed("Event not scheduled. Use !event again to restart.");
        } catch(e) {
            console.log(e, /TZERR/)
        }

        
    },
    info: {
        aliases: false,
        example: "!createevent",
        minarg: 0,
        description: "Schedules an event and sends it to #events",
        category: "Staff",
    }
}