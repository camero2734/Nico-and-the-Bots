module.exports = {
    execute: async function(msg) {
        const Lyricist = require("lyricist");
        const genius = new Lyricist("gvpQWifP9sQyW1LVN47jeDyjlo9v0Vk5Kk8eXMUXRNlUqwXtsaryp2AN8N6CKjVC");

        let query = removeCommand(msg.content);
        try {
            const song = await genius.song((await genius.search(query))[0].id, { fetchLyrics: true });
            let lyrics = song.lyrics;
            //GET RANDOM STANZA
            let stanzas = lyrics.split("\n\n");
            let stanza = stanzas[Math.floor(Math.random() * stanzas.length)];
            
            //GET RANDOM 4 LINES
            let _linesArr = stanza.split("\n");
            let linesArr = [];
            for (let i = 0; i < _linesArr.length; i++) if (!/^\[.*\]$/.test(_linesArr[i].trim()) && _linesArr[i] !== "" && _linesArr[i] !== "\n") linesArr.push(_linesArr[i]);
            let lines;
            if (linesArr.length <= 4) lines = linesArr.join("\n");
            else {
                let start = Math.floor(Math.random() * (linesArr.length - 4));
                let chosenLines = linesArr.slice(start, start+4);
                lines = chosenLines.join("\n");
            }
            let title = song.full_title ? song.full_title : "Song";
            let artistIcon = song.primary_artist && song.primary_artist.image_url ? song.primary_artist.image_url : "http://4.bp.blogspot.com/-w4LCaX6Jygs/Vn03_XqduwI/AAAAAAABAdg/MQoOpVjA6es/s1600/ICON.png";
            let albumIcon = song.album && song.album.cover_art_url ? song.album.cover_art_url : artistIcon;
            let embed = new Discord.RichEmbed().setDescription(lines).setColor("RANDOM");
            embed.setAuthor(title, artistIcon);
            embed.setThumbnail(albumIcon);
            msg.channel.send(embed);

        } catch(e) {
            console.log(e)
            return msg.channel.embed("Unable to find song. Make sure to include both song and artist.")
        }
    },
    info: {
        aliases: false,
        example: "!randomlyric (song name)",
        minarg: 0,
        description: "Sends a random twenty one pilots lyric",
        category: "Fun",
    }
}