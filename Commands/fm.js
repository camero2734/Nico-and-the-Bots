module.exports = {
    execute: async function (msg) {
        //DETERMINE INPUT TYPE
        let username = null;
        //MENTION
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) {
            let user_id = msg.mentions.users.first().id;
            let mentionedItem = await connection.getRepository(Item).findOne({ id: user_id, type: "FM" });
            if (!mentionedItem) return msg.channel.embed("The mentioned user does not have their FM set up!");
            else username = mentionedItem.title;
        }
        //USERNAME
        else if (msg.args && msg.args.length > 1) {
            username = removeCommand(msg.content);
        }
        //OWN
        else {
            let userItem = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "FM" });
            if (!userItem) return msg.channel.embed("Your FM is not set up! Use `!setfm` to set it up.");
            else username = userItem.title;
        }

        try {
            let url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.LASTFM}&format=json`;
            console.log(url, /FIRSTURL/);
            let response = (await snekfetch.get(url)).body;
            //console.log(response.recenttracks.track, /RESPONSE/);
            let info = response.recenttracks;
            let total = info["@attr"].total;

            let track = { album: info.track[0].album["#text"], artist: info.track[0].artist["#text"], name: info.track[0].name, image: info.track[0].image.pop()["#text"], date: info.track[0].date ? "Played: " + info.track[0].date["#text"] : "Now playing" };

            let playCountRequest = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username=${username}&api_key=${process.env.LASTFM}&track=${track.name}&artist=${track.artist.replace(/•/g, " ")}&api_key=${process.env.LASTFM}&format=json`;
            let playCountResponse = {};
            try {
                playCountResponse = (await snekfetch.get(playCountRequest)).body;
            } catch (e) { }
            console.log(playCountRequest, playCountResponse, /PLAYCOUNTRESPONSE/);

            let embed = new Discord.RichEmbed().setColor(msg.member.displayHexColor);
            embed.setTitle(username + "'s FM");
            embed.addField("Title", track.name ? track.name : "No Title", true);
            embed.addField("Album", track.album ? track.album : "No Album", true);
            embed.addField("Artist", track.artist ? track.artist : "No Artist", true);
            embed.setThumbnail(track.image ? track.image : "http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg");
            embed.setFooter(track.date + ` || ${playCountResponse.track ? playCountResponse.track.userplaycount : 0} song scrobbles || ${total} scrobbles total`, bot.displayAvatarURL);
            msg.channel.send(embed);
        } catch (e) {
            console.log(e, /FM_ERROR/);
            msg.channel.embed("Error in fetching the FM. Did you set your FM correctly?");
        }
    },
    info: {
        aliases: false,
        example: "!fm pootusmaximus",
        minarg: 0,
        description: "Sends an embed with last scrobbled song from lastfm",
        category: "N/A"
    }
};