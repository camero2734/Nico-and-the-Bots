module.exports = {
    execute: async function (msg, args) {
        const map = (num, in_min, in_max, out_min, out_max) => {return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;}
        let page = !isNaN(msg.args[1]) && msg.args[1] >= 1 ? msg.args[1] : 1;
        let songsjson = await loadJsonFile("songDiscussion.json");
        let arr = [];
        let lowest = 6;
        let highest = 0;
        for (let album in songsjson) {
            for (let song in songsjson[album]) {
                if (songsjson[album][song].hasOwnProperty("rating")) {
                    if (songsjson[album][song].rating < lowest) lowest = songsjson[album][song].rating;
                    if (songsjson[album][song].rating > highest) highest = songsjson[album][song].rating;
                    arr.push({name: song, album: album, rating: songsjson[album][song].rating});
                }
            }
        }
        let maxPage = Math.ceil(arr/10);
        if (page > maxPage) return msg.channel.embed(`There are only ${maxPage} pages.`);
        arr.sort((a,b) => (a.rating < b.rating) ? 1 : ((b.rating < a.rating) ? -1 : 0)); 
        for (let i = 0; i < arr.length; i++) arr[i].relrating = map(arr[i].rating, lowest, highest, 0, 5).toFixed(3);
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        for (let i = 10 * page - 10; i < 10 * page; i++) {
            if (arr[i]) embed.addField((i+1) + ". " + arr[i].name + " (" + arr[i].rating + ", " + arr[i].relrating + ")", arr[i].album)
        }
        msg.channel.send(embed);
    },
    info: {
        aliases: false,
        example: "!songtop",
        minarg: 0,
        description: "Displays current leaderboard for song rankings",
        category: "Other",
    }
}