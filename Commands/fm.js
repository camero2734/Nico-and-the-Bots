module.exports = {
    execute: async function (msg) {
        //DETERMINE INPUT TYPE
        let username = null;
        let selfFM = false;
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
            selfFM = true;
        }

        try {
            let url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.LASTFM}&format=json`;
            // console.log(url, /URL/)
            let response = (await snekfetch.get(url)).body;
            //console.log(response.recenttracks.track, /RESPONSE/);
            let info = response.recenttracks;
            let total = info["@attr"].total;

            let track = { album: info.track[0].album["#text"], artist: info.track[0].artist["#text"], name: info.track[0].name, image: info.track[0].image.pop()["#text"], date: info.track[0].date ? "Played: " + info.track[0].date["#text"] : "Now playing" };

            let trackRequest = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username=${username}&api_key=${process.env.LASTFM}&track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}&api_key=${process.env.LASTFM}&format=json`;
            let artistRequest = `http://ws.audioscrobbler.com/2.0/?method=artist.getInfo&username=${username}&api_key=${process.env.LASTFM}&track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}&api_key=${process.env.LASTFM}&format=json`;
            let albumRequest = `http://ws.audioscrobbler.com/2.0/?method=album.getInfo&username=${username}&api_key=${process.env.LASTFM}&album=${encodeURIComponent(track.album)}&artist=${encodeURIComponent(track.artist)}&api_key=${process.env.LASTFM}&format=json`;
            let trackPlay = {};
            let artistPlay = {};
            let albumPlay = {};
            try {
                trackPlay = (await snekfetch.get(trackRequest)).body;
                artistPlay = (await snekfetch.get(artistRequest)).body;
                albumPlay = (await snekfetch.get(albumRequest)).body;
            } catch (e) {console.log(e, /ERROR/)}

            function us_pl(us_in) {
                //  In: https://www.last.fm/music/Starset/_/TELEKINETIC
                // Out: https://www.last.fm/user/pootusmaximus/library/music/Starset/_/TELEKINETIC
                return us_in.replace("last.fm/music", `last.fm/user/${username}/library/music`)
            }

            let embed = new Discord.RichEmbed().setColor(msg.member.displayHexColor);
            embed.setTitle(`${username}'s FM`);
            embed.addField("Title", (track.name ? track.name : "No Title") + `  \n[${trackPlay.track ? trackPlay.track.userplaycount : 0} plays](${us_pl(trackPlay.track ? trackPlay.track.url : "https://www.last.fm")})`, true);
            embed.addField("Album", (track.album ? track.album : "No Album") + `  \n[${albumPlay.album ? albumPlay.album.userplaycount : 0} plays](${us_pl(albumPlay.album.url)})`, true);
            embed.addField("Artist", (track.artist ? track.artist : "No Artist") + `  \n[${(artistPlay.artist && artistPlay.artist.stats) ? artistPlay.artist.stats.userplaycount : 0} plays](${us_pl(artistPlay.artist.url)})`, true);
            embed.setThumbnail(track.image ? track.image : "http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg");
            // embed.addField("\u200b", "<:UpFCE300:664678209157333016> Like <:DownFCE300:664678208981172225> Dislike <:questionmarkFCE300:664678208578256908> Never heard");
            embed.setFooter(track.date);
            embed.setAuthor(total + " total scrobbles", "http://icons.iconarchive.com/icons/sicons/flat-shadow-social/512/lastfm-icon.png", `https://www.last.fm/user/${username}`);
            let fm_m = await msg.channel.send(embed);
            
            // if (!selfFM) return;
            return; // TODO: remove and make embed look better
            await fm_m.react("664678209157333016"); // Up
            await fm_m.react("664678208981172225"); // Down
            await fm_m.react("664678208578256908"); // Question

            let fm_json = {
                userid: msg.author.id, 
                track: track.name || "N/A", 
                album: track.album || "N/A", 
                artist: track.artist || "N/A", 
                upvotes: 0, 
                downvotes: 0, 
                unknowns: 0
            };
            let fm_item = new Item(fm_m.id, JSON.stringify(fm_json), "FMVote", Date.now());
            await connection.manager.save(fm_item);
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