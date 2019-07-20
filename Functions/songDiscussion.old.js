module.exports = async function (guild) {
    console.log("songdiscussion called");
    guild.client.on('raw', raw)
    guild.client.on('messageReactionAdd', reactionAdded);
    guild.client.on('messageReactionRemove', reactionAdded);
    guild.client.on('message', async (msg) => {
        if (msg.content === "!newsong" && msg.author.id === "221465443297263618") {
            chooseSong();
        }
    })
    const loadJsonFile = require('load-json-file');
    const writeJsonFile = require('write-json-file');
    const ytsr = require('ytsr');
    let ontime = require("ontime");
    const Discord = require("discord.js");
    console.log("loaded");
    let channel = guild.channels.get("524401231150710794");

    let json = await loadJsonFile("songDiscussion.json");
    console.log(json, /JSON/)

    ontime({
        cycle: '07:30:00'
    }, function (ot) {
        console.log("choosing songs?")
        chooseSong();
        ot.done();
        return
    })


    //CREATE SONGS ARRAY
    let songs = [];
    // let npi = ["Blasphemy", "Drown", "Hole In The Ground", "Save", "Taken By Sleep", "Just Like Yesterday", "Prove Me Wrong", "Realize That It's Gone", "Tonight", "Falling Too", "TB Saga", "Where Did We Go", "Hear Me Now", "Going Down"];
    let top = ["Implicit Demand for Proof", "Fall Away", "The Pantaloon", "Addict with a Pen", "Friend, Please", "March to the Sea", "Johnny Boy", "Oh Ms Believer", "Air Catcher", "Trapdoor", "A Car, a Torch, a Death", "Taxi Cab", "Before You Start Your Day", "Isle of Flightless Birds"];
    let rab = ["Guns for Hands", "Holding on to You", "Ode to Sleep", "Slowtown", "Car Radio", "Forest", "Glowing Eyes", "Kitchen Sink", "Anathema", "Lovely", "Ruby", "Trees", "Be Concerned", "Clear"];
    let ves = ["Ode to Sleep", "Holding on to You", "Migraine", "House of Gold", "Car Radio", "Semi-Automatic", "Screen", "The Run and Go", "Fake You Out", "Guns for Hands", "Trees", "Truce", "Lovely"];
    let blf = ["Heavydirtysoul", "Stressed Out", "Ride", "Fairly Local", "Tear in My Heart", "Lane Boy", "The Judge", "Doubt", "Polarize", "We Don't Believe What's on TV", "Message Man", "Hometown", "Not Today", "Goner"];
    let trc = ["Jumpsuit", "Levitate", "Morph", "My Blood", "Chlorine", "Smithereens", "Neon Gravestones", "The Hype", "Nico and the Niners", "Cut My Lip", "Bandito", "Pet Cheetah", "Legend", "Leave the City"];
    let etc = ["Heathens", "Cancer (Cover)", "Time to Say Goodbye"];
    let xmm = ["Heathens", "Heavydirtysoul", "Ride", "Tear in My Heart", "Lane Boy"];

    // for (let song of npi) songs.push({title: song, album: "No Phun Intended", color: "b18f95", image: "http://hw-img.datpiff.com/m5ee9036/Tyler_Joseph_No_Phun_Intended-front-large.jpg"});
    for (let song of top) songs.push({title: song, album: "Twenty One Pilots", color: "af679d", image: "https://upload.wikimedia.org/wikipedia/en/thumb/8/82/Twenty_One_Pilots_album_cover.jpg/220px-Twenty_One_Pilots_album_cover.jpg"});
    for (let song of rab) songs.push({title: song, album: "Regional at Best", color: "206694", image: "http://36.media.tumblr.com/e8186478ae67dff936b328b17ed7fd41/tumblr_nxzklkgOEs1s5qytdo3_1280.jpg"});
    for (let song of ves) songs.push({title: song, album: "Vessel", color: "aebfd8", image: "http://vol9.music-bazaar.com/album-images/vol9/489/489384/2319951-big/Vessel-cover.jpg"});
    for (let song of blf) songs.push({title: song, album: "Blurryface", color: "ec5747", image: "https://s1-ssl.dmcdn.net/Mreff/x1080-tMz.jpg"});
    for (let song of trc) songs.push({title: song, album: "Trench", color: "fce300", image: "https://rockinathens.gr/wp-content/uploads/2018/10/281002.jpg"});
    for (let song of etc) songs.push({title: song, album: "Single/Unreleased", color: "#696969", image: "https://upload.wikimedia.org/wikipedia/en/thumb/6/66/TwentyOnePilotsBarsLogo2018Gritty_yellow.png/200px-TwentyOnePilotsBarsLogo2018Gritty_yellow.png"});
    for (let song of xmm) songs.push({title: song, album: "TOPxMM", color: "#E74B35", image: "https://m.media-amazon.com/images/I/81HVAuGowwL._SS500_.jpg"});


    //CREATE/UPDATE SONGS JSON
    for (let song of songs) {
        if (!json[song.album]) json[song.album] = {color: song.color, image: song.image}
        if (!json[song.album][song.title]) json[song.album][song.title] = {uses: 0}
    }
    await writeJsonFile("songDiscussion.json", json);

    //UPDATE SONG EVERY DAY AT A CERTAIN TIME
    

    async function chooseSong() {
        console.log("CHOOSING SONG!!!!!")
        
        //Clear previous reactions
        let msgs = await channel.fetchMessages({limit: 10})
        let arrM = msgs.array();
        for (let m of arrM) {if (m.reactions.array().length > 0) await m.clearReactions()};
        console.log("test1")
        let lowest = 0;
        //Find lowest count
        //for (let album in json) {for (let song in json[album]) {if (song === "color" || song === "image") continue;lowest = Math.min(lowest, json[album][song].uses);}}
        //Create an array of songs with lowest count
        let toPick = [];
        console.log("test2");
        
        try {
            for (let album in json) {
                //console.log(album, /ALBUM/)
                for (let song in json[album]) {
                    if (song === "color" || song === "image") continue;
                    else if (json[album][song].uses === lowest && !json[album][song].rating) toPick.push({album: album, song: song, color: json[album].color, image: json[album].image});
                }
            }
        } catch (err) {
            console.log(err, /ERRRR/)
        }
        console.log("test3")
        //SHUFFLE
        let index = 0;
        index = Math.floor(toPick.length * Math.random());

        //Send chosen song
        console.log("test3")
        let chosen = toPick[index];
        console.log(toPick.length, /PICKABLE SONGS/);
        console.log(chosen, /CHOSEN/);
        guild.channels.get("470406597860917249").embed(chosen.song);
        guild.channels.get("524287013357355018").setName(chosen.song);
        let url = await searchYoutube(chosen.song + " " + chosen.album +  " twenty one pilots");
        let embed = new Discord.RichEmbed();
        embed.setColor(chosen.color);
        embed.addField("Song", chosen.song);
        embed.addField("Album", chosen.album);
        embed.addField("Link", url)
        embed.setThumbnail(chosen.image);
        embed.setAuthor("#"+ (1 + songs.length - toPick.length));
        embed.setFooter("Rating: 5")
        let m = await channel.send(embed);
        let reacts = ['1⃣', "2⃣", '3⃣', "4⃣", "5⃣"]
        for (let react of reacts) await m.react(react)
        //console.log(chosen.album, chosen.song);
        json[chosen.album][chosen.song].uses++;
        await writeJsonFile("songDiscussion.json", json);
        console.log("test4")
    }

    async function fetchAllUsers(msg, react) {
        return new Promise(async resolve => {
            let done = false;
            let count = 0;
            let cur = null;
            while (!done) {
                let usrs = await msg.reactions.get(react).fetchUsers(100, cur === null ? {} : {after: cur});
                let toAdd = usrs.array();
                if (toAdd.length === 0) done = true;
                else count+=toAdd.length, cur = toAdd[toAdd.length - 1].id;
            }
            resolve(count);
        })
    }
    
    async function reactionAdded(reaction, user) {
        let msg = reaction.message;
        let emd = msg.embeds[0];
        let reacts = ['1⃣', "2⃣", '3⃣', "4⃣", "5⃣"]
        if (msg.channel.id !== channel.id) return;
        if (!msg.author.bot) return;
        if (reacts.indexOf(reaction.emoji.name) === -1) return;
        let counts = [];
        let reactions = msg.reactions.array();
        for (let react of reacts) {
            let count = await fetchAllUsers(msg,react)
            counts.push(count);
        }
        console.log(counts, /COUNTS/)
        counts = counts.slice(0, 5);
        let sum = 0;
        let num = 0;
        for (let i = 0; i < counts.length; i++) {
            sum += (i+1) * counts[i];
            num += counts[i];
        }
        let avg = ((sum - 15) / (num - 5 > 0 ? num - 5 : 1)).toFixed(3);
        //encode nums
        let _arr = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*áéØ+~`-=öíóñÓ':;?ø>.<,";
        let c = [counts[0] - 1, counts[1] - 1, counts[2] - 1, counts[3] - 1, counts[4] - 1];
        function getChar(i1, i2) {
            let mod = (c[i1] * c[i2]) % 92
            return _arr.charAt(mod).toString();
        }
        let mult = Math.round(avg*(num-5));
        let m1 = (mult % 92);
        let m2 = ((Math.floor(mult/92)) % 92);
        console.log(getChar(0,1) + getChar(1,2) + getChar(2,3) + getChar(3,4) + _arr[m2] + _arr[m1], /STR/)
        let str = getChar(0,1) + getChar(1,2) + getChar(2,3) + getChar(3,4) + _arr[m2] + _arr[m1];
        let embed = new Discord.RichEmbed(emd);
        embed.setFooter("Rating: " + avg + ` [${str}]`);
        if (counts.length > 4) {
            msg.edit(embed);
            let song = emd.fields.find((v) => {return v.name === "Song"}).value;
            let album = emd.fields.find((v) => {return v.name === "Album"}).value;
            json[album][song].rating = avg;
            await writeJsonFile("songDiscussion.json", json);
        }
        
    }
    
    async function raw(event) {
        const events = {MESSAGE_REACTION_ADD: 'messageReactionAdd',MESSAGE_REACTION_REMOVE: 'messageReactionRemove',};
        if (!events.hasOwnProperty(event.t)) return;
        const { d: data } = event; const user = guild.client.users.get(data.user_id); const channel = guild.client.channels.get(data.channel_id) || await user.createDM();
        if (channel.messages.has(data.message_id)) return;
        const message = await channel.fetchMessage(data.message_id);
        const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
        const reaction = message.reactions.get(emojiKey);
        guild.client.emit(events[event.t], reaction, user);
    }

    async function searchYoutube(query) {
        return new Promise(resolve => {
            ytsr(query, {}, function(err, searchResults) {
                if(err) resolve("");
                else resolve(searchResults.items[0].link)
            });
        })
    }
}