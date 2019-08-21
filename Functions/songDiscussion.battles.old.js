module.exports = async function (guild) {
    const fs = require("fs");
    const snekfetch = require("snekfetch");
    const { createCanvas, loadImage, Image, registerFont } = require("canvas");
    console.log("songdiscussion called");
    guild.client.on("raw", raw);
    guild.client.on("messageReactionAdd", reactionAdded);
    guild.client.on("messageReactionRemove", reactionAdded);
    guild.client.on("message", async (msg) => {
        if (msg.content === "!newsong" && msg.author.id === "221465443297263618") {
            chooseSong();
        }
    });
    const loadJsonFile = require("load-json-file");
    const writeJsonFile = require("write-json-file");
    const ytsr = require("ytsr");
    let ontime = require("ontime");
    const Discord = require("discord.js");
    console.log("loaded");
    let channel = guild.channels.get("524401231150710794");

    let json = await loadJsonFile("songBattles.json");
    let bracket;


    class Bracket {
        constructor(name, players, player1, player2, ended) {
            this.name = name;
            this.ended = ended || false;
            this.players = players || [];
            this.player1 = player1 || -1;
            this.player2 = player2 || -1;
        }
    
        addPlayer(name) {
            this.players.push({ name: name, wins: 0, autoWins: 0, eliminated: false });
        }
    
        getRound() {
            let rounds = 0;
            for (let p of this.players) rounds += (p.wins - p.autoWins);
            return rounds;
        }

        getPlayer1() {
            if (this.player1 < 0) return {};
            return this.players[this.player1];
        }
    
        getPlayer2() {
            if (this.player2 < 0) return {};
            return this.players[this.player2];
        }
    
        nextRound() {
            if (this.player1 === -1 && this.player2 === -1) {
                console.log("GOOD!");

                let availablePlayers = [];

                for (let player of this.players) {
                    if (!player.eliminated) availablePlayers.push(player);
                }
                
                if (availablePlayers.length <= 1) {
                    this.ended = true;
                    return false;
                }

                availablePlayers.sort((a, b) => {
                    if (b.wins === a.wins) {
                        if (b.autoWins === a.autoWins) return Math.random() < 0.5 ? -1 : 1;
                        else return a.autoWins - b.autoWins;
                    }
                    return a.wins - b.wins;
                });

                this.player1 = this.players.indexOf(availablePlayers[0]);
                this.player2 = this.players.indexOf(availablePlayers[1]);

                return [this.getPlayer1(), this.getPlayer2()];
            }
        }
    
        writeToFile(fileName) {
            let json = {};
            json.name = this.name;
            json.players = this.players;
            json.player1 = parseInt(this.player1);
            json.player2 = parseInt(this.player2);
            json.ended = this.ended;
            fs.writeFileSync(fileName, JSON.stringify(json));
        }
    
        chooseWinner(num, autoAdvanced) {
            if (num === 1 && this.player1 !== -1) {
                this.players[this.player1].wins++;
                if (autoAdvanced) this.players[this.player1].autoWins++;
                let toReturn = this.getPlayer1();
                if (this.player2 !== -1) this.players[this.player2].eliminated = true;
                this.player1 = -1;
                this.player2 = -1;
                console.log("YEAAAAH BOIIIIII");
                return toReturn;
            } else if (num === 2 && this.player2 !== -1) {
                this.players[this.player2].wins++;
                let toReturn = this.getPlayer2();
                if (this.player1 !== -1) this.players[this.player1].eliminated = true;
                this.player1 = -1;
                this.player2 = -1;
                return toReturn;
            }
            
        }
    }
    


    ontime({
        cycle: [ "06:00:00", "18:00:00" ]
    }, function (ot) {
        console.log("choosing songs?");
        //chooseSong();
        ot.done();
        return;
    });


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
    for (let song of top) songs.push({ title: song, album: "Twenty One Pilots", color: "af679d", image: "https://upload.wikimedia.org/wikipedia/en/thumb/8/82/Twenty_One_Pilots_album_cover.jpg/220px-Twenty_One_Pilots_album_cover.jpg" });
    for (let song of rab) songs.push({ title: song, album: "Regional at Best", color: "206694", image: "http://36.media.tumblr.com/e8186478ae67dff936b328b17ed7fd41/tumblr_nxzklkgOEs1s5qytdo3_1280.jpg" });
    for (let song of ves) songs.push({ title: song, album: "Vessel", color: "aebfd8", image: "https://upload.wikimedia.org/wikipedia/en/2/20/Vessel_by_Twenty_One_Pilots.jpg" });
    for (let song of blf) songs.push({ title: song, album: "Blurryface", color: "ec5747", image: "https://s1-ssl.dmcdn.net/Mreff/x1080-tMz.jpg" });
    for (let song of trc) songs.push({ title: song, album: "Trench", color: "fce300", image: "https://rockinathens.gr/wp-content/uploads/2018/10/281002.jpg" });
    for (let song of etc) songs.push({ title: song, album: "Single/Unreleased", color: "#696969", image: "https://upload.wikimedia.org/wikipedia/en/thumb/6/66/TwentyOnePilotsBarsLogo2018Gritty_yellow.png/200px-TwentyOnePilotsBarsLogo2018Gritty_yellow.png" });
    for (let song of xmm) songs.push({ title: song, album: "TOPxMM", color: "#E74B35", image: "https://m.media-amazon.com/images/I/81HVAuGowwL._SS500_.jpg" });

    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }


    if (json && json.name) {
        bracket = new Bracket(json.name, json.players, json.player1, json.player2, json.ended);
    } else {
        bracket = new Bracket("Song Battles");
        shuffle(songs);
        for (let song of songs) {
            bracket.addPlayer(song);
        }
    }

    //UPDATE SONG EVERY DAY AT A CERTAIN TIME
    async function chooseSong() {
        console.log("CHOOSING SONG!!!!!");
        
        //Clear previous reactions
        if (!channel) channel = guild.channels.get("524401231150710794");
        let msgs = await channel.fetchMessages({ limit: 1 });
        let m = msgs.first();
        if (m && bracket.player1 !== -1) {
            try {
                console.log("choosing winner");
                let oldEmbed = m.embeds && m.embeds[0];
                if (oldEmbed && oldEmbed.title.startsWith("Round")) {
                    let reacts = ["1⃣", "2⃣"];
                    let counts = [];
                    for (let react of reacts) {
                        let count = await fetchAllUsers(m, react);
                        counts.push(count);
                    }

                    // if (oldEmbed.footer && oldEmbed.footer.text.indexOf("Ended") !== -1) {
                    //     let preText = oldEmbed.footer.text.split(":")[1].trim();
                    //     let c1 = preText.split("-")[0];
                    //     let c2 =  preText.split("-")[1];
                    //     counts[0] = !isNaN(c1) ? c1 : counts[0];
                    //     counts[1] = !isNaN(c2) ? c2 : counts[1];
                    // }

                    if (counts[0] === counts[1]) {
                        console.log("Tie!");

                        let newEmbed = new Discord.RichEmbed(oldEmbed);
                        newEmbed.setFooter("Ended: " + counts[0] + "-" + counts[1]);
                        newEmbed.setThumbnail("attachment://albums.png");
                        newEmbed.fields[0].name += " - Tied";
                        newEmbed.fields[2].name += " - Tied";
                        bracket.player1 = -1;
                        bracket.player2 = -1;
                        await m.edit(newEmbed);
                    } else {
                        let winNum = counts[0] >= counts[1] ? 1 : 2;
                        console.log("Song " + winNum + " wins");
                        await bracket.chooseWinner(winNum);
    
                        // if (!oldEmbed.footer || oldEmbed.footer.text.indexOf("Ended") === -1) {
                        let newEmbed = new Discord.RichEmbed(oldEmbed);
                        newEmbed.setFooter("Ended: " + counts[0] + "-" + counts[1]);
                        newEmbed.setThumbnail("attachment://albums.png");
                        let oldName = newEmbed.fields[winNum === 1 ? 0 : 2].name.split("-")[0].trim();
                        console.log(oldName, /NAME/);
                        newEmbed.fields[winNum === 1 ? 0 : 2].name = oldName + " - Winner";
                        await m.edit(newEmbed);
                        //}
                    }
                    //await m.clearReactions();
                    
                }
            } catch(e) {
                console.log(e, /INSONGERROR/);
            }
            
        }
        let players = await bracket.nextRound();
        if (!players) {
            await channel.embed("THE SONG BATTLES HAVE NOW ENDED.");
        }

        let embed = new Discord.RichEmbed();
        let song1 = players[0];
        let song2 = players[1];
        if (!song1 || !song2) console.log("Corrupted songs");

        try {
            embed.setTitle("Round " + (bracket.getRound() + 1));
            embed.addField("Song 1", song1.name.title + " - " + song1.name.album);
            let link1 = await searchYoutube(song1.name.title + " " + song1.name.album);
            embed.addField("Link", link1 ? link1 : "No Link Available");
            embed.addField("Song 2", song2.name.title + " - " + song2.name.album);
            let link2 = await searchYoutube(song2.name.title + " " + song2.name.album);
            embed.addField("Link", link2 ? link2 : "No Link Available");
            embed.setColor(song1.name.color);
            try {
                let splitImg = await getImageSplit(song1.name.image, song2.name.image);
                embed.attachFile({ attachment: splitImg, name: "albums.png" });
                embed.setThumbnail("attachment://albums.png");
            } catch(e) {}
            let em_m = await channel.send(embed);
            await em_m.react("1⃣");
            await em_m.react("2⃣");
            let prefix1 = song1.name.album === "Regional at Best" ? "rab-" : (song1.name.album === "TOPxMM" ? "topxmm-" : "");
            let prefix2 = song2.name.album === "Regional at Best" ? "rab-" : (song2.name.album === "TOPxMM" ? "topxmm-" : "");
            await channel.guild.channels.get("524287013357355018").setName(prefix1 + song1.name.title + "-vs-" + prefix2 + song2.name.title);
            bracket.writeToFile("songBattles.json");
        } catch(e) {
            console.log(e, /SONGDISCUSSIONERROR/);
        }
        
    }

    async function fetchAllUsers(msg, react) {
        return new Promise(async resolve => {
            let done = false;
            let count = 0;
            let cur = null;
            while (!done) {
                let reaction = msg.reactions.get(react);
                if (!reaction) done = true;
                else {
                    let usrs = await reaction.fetchUsers(100, cur === null ? {} : { after: cur });
                    let toAdd = usrs.array();
                    if (toAdd.length === 0) done = true;
                    else count += toAdd.length, cur = toAdd[toAdd.length - 1].id;
                }
            }
            resolve(count);
        });
    }
    
    async function getImageSplit(album1, album2) {
        try {
            let img1 = (await snekfetch.get(album1)).body;
            let img2 = (await snekfetch.get(album2)).body;
            
            let canvas = createCanvas(600, 600);
            let ctx = canvas.getContext("2d");
            let a1 = new Image();
            let a2 = new Image();
            a1.src = img1;
            a2.src = img2;
    
            ctx.drawImage(a1, 0, 0, a1.width / 2, a1.height, 0, 0, 300, 600);
            ctx.drawImage(a2, a2.width / 2, 0, a2.width / 2, a2.height, 300, 0, 300, 600);

            ctx.strokeStyle = "white";
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(300, 0);
            ctx.lineTo(300, 600);
            ctx.stroke();

            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(300, 0);
            ctx.lineTo(300, 600);
            ctx.stroke();

            return canvas.toBuffer();
        } catch (err) {
            let canvas = createCanvas(600, 600);
            return canvas.toBuffer();
            console.log(err, /SPLITERR/);
        }
    }

    async function reactionAdded(reaction, user) {
        let msg = reaction.message;
        let emd = msg.embeds[0];
        let reacts = ["1⃣", "2⃣"];
        if (!channel) channel = guild.channels.get("524401231150710794");
        if (msg.channel.id !== channel.id) return;
        if (!msg.author.bot) return;
        if (reacts.indexOf(reaction.emoji.name) === -1) return;
        let counts = [];
        let reactions = msg.reactions.array();
        for (let react of reacts) {
            let count = await fetchAllUsers(msg, react);
            counts.push(count);
        }
        console.log(counts, /COUNTS/);
    }
    
    async function raw(event) {
        const events = { MESSAGE_REACTION_ADD: "messageReactionAdd", MESSAGE_REACTION_REMOVE: "messageReactionRemove"  };
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
            console.log(query, /YTSR/);
            ytsr(query, {}, function(err, searchResults) {
                if (err) {
                    console.log(err, /YTSRERR/);
                    resolve("");
                }
                else {
                    resolve(searchResults.items[0].link);
                }
            });
        });
    }
};