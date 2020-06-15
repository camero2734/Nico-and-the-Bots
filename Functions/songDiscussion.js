module.exports = async function (guild) {
    return;
    const fs = require("fs");
    const snekfetch = require("snekfetch");
    const { createCanvas, loadImage, Image, registerFont } = require("canvas");
    console.log("songdiscussion called");
    guild.client.on("raw", raw);
    guild.client.on("messageReactionAdd", reactionAdded);
    guild.client.on("messageReactionRemove", reactionAdded);
    guild.client.on("message", async (msg) => {
        if (msg.content === "!newsong" && msg.author.id === "221465443297263618") {
            await chooseSong();
            await msg.channel.send("Done!");
        }
    });
    const loadJsonFile = require("load-json-file");
    const writeJsonFile = require("write-json-file");
    const ytsr = require("ytsr");
    let ontime = require("ontime");
    const Discord = require("discord.js");
    console.log("loaded");
    let channel = guild.channels.get("524401231150710794");

    let json = await loadJsonFile("./json/songRank.json");

    ontime({
        cycle: ["06:00:00", "18:00:00"]
    }, async function (ot) {
        console.log("choosing songs?");
        await chooseSong();
        ot.done();
        return;
    });

    //UPDATE SONG EVERY DAY AT A CERTAIN TIME
    async function chooseSong(rerun) {
        //CHECK CURRENT WINNER
        if (json.id && !rerun) {
            let m = await channel.fetchMessage(json.id);
            let reacts = ["1⃣", "2⃣"];
            let votes1 = await fetchAllUsers(m, reacts[0]);
            let votes2 = await fetchAllUsers(m, reacts[1]);

            function getIndexFromSong(song) {
                for (let joi = 0; joi < json.originalSongs.length; joi++) {
                    if (json.originalSongs[joi].name === song.name && json.originalSongs[joi].album === song.album) return joi;
                }
                return -1;
            }


            let song1 = json.songs[json.arr1][json.index1];
            let song2 = json.songs[json.arr2][json.index2];
            console.log(song1.name, song2.name, /NAMES/);
            if (votes1 > votes2) {
                let winlose = { winner: getIndexFromSong(song1), loser: getIndexFromSong(song2) };
                json.history.push(winlose);
                // Move song 1 in front of song 2 in 2nd array
                json.songs[json.arr2].splice(json.index2, 0, json.songs[json.arr1].shift());
                // Stay on same song in 2nd array
                json.index2++;
            } else {
                let winlose = { winner: getIndexFromSong(song2), loser: getIndexFromSong(song1) };
                json.history.push(winlose);
                // No insertion, just move to the next song in 2nd array
                json.index2++;
            }

            let embed = new Discord.RichEmbed(m.embeds[0]);
            embed.setFooter(`Ended: ${votes1}-${votes2}`);
            embed.setThumbnail("attachment://albums.png");
            embed.fields[votes1 > votes2 ? 0 : 1].name = `Song ${votes1 > votes2 ? 1 : 2} - Winner`;
            m.edit(embed);
        }

        if (json.songs.length > 1) {
            //FIND NEW GROUPS
            if (json.arr1 === null || json.arr2 === null || json.arr1 === json.arr2) {
                for (let jsi in json.songs) {
                    if (json.songs[jsi].length <= json.curLength) {
                        if (json.arr1 === null) {
                            json.arr1 = jsi;
                        } else {
                            if (jsi !== json.arr1 && jsi !== json.arr2) {
                                if (json.songs[jsi].length < json.songs[json.arr1].length) {
                                    json.arr2 = json.arr1;
                                    json.arr1 = jsi;
                                } else json.arr2 = jsi;
                                break;
                            }

                        }
                    }
                }

                //CURLENGTH TOO SMALL, MOVE UP TO BIGGER GROUPS
                console.log(json.arr1, json.arr2, /ABOUTTORERUN/);
                if (json.arr1 === null || json.arr2 === null || json.arr1 === json.arr2) {
                    console.log(`increasing length from ${json.curLength} to ${json.curLength + 1}`);
                    json.curLength++;
                }
                else {
                    json.index1 = 0;
                    json.index2 = 0;
                }
                return chooseSong(true);
            } else if (json.songs[json.arr1].length > 0) { //STILL HAVE SONGS IN ARR1 TO PLACE IN ARR2
                if (json.index2 === json.songs[json.arr2].length) { //IF LESS THAN ALL, PLACE ALL SONGS AT THE END
                    for (let i = json.songs[json.arr1].length - 1; i >= 0; i--) {
                        json.songs[json.arr2].push(json.songs[json.arr1].shift());
                    }
                    return chooseSong(true);
                } else {
                    //SEND EMBED OF SONGS
                    let song1 = json.songs[json.arr1][json.index1];
                    let song2 = json.songs[json.arr2][json.index2];

                    let yt1 = await searchYoutube(song1.name + " " + song1.album + " twenty one pilots");
                    let yt2 = await searchYoutube(song2.name + " " + song2.album + " twenty one pilots");


                    let embed = new Discord.RichEmbed().setColor(song1.color).setTitle(`Match #${json.history.length + 1}`);

                    embed.addField("Song 1", `[${song1.name + " - " + song1.album}](${yt1 ? yt1 : "https://www.youtube.com/watch?v=HpqjueKUQWs"})`);
                    embed.addField("Song 2", `[${song2.name + " - " + song2.album}](${yt2 ? yt2 : "https://www.youtube.com/watch?v=HpqjueKUQWs"})`);
                    embed.setFooter(`${json.songs.length} groupings remaining || Current sizes: [${json.songs[json.arr1].length}, ${json.songs[json.arr2].length}]`);
                    try {
                        let splitImg = await getImageSplit(song1.image, song2.image);
                        embed.attachFile({ attachment: splitImg, name: "albums.png" });
                        embed.setThumbnail("attachment://albums.png");
                    } catch (e) { }

                    let m = await channel.send(embed);

                    let name1 = song1.name + (song1.album === "Regional at Best" ? "-rab" : (song1.album === "TOPxMM" ? "-topxmm" : ""));
                    let name2 = song2.name + (song2.album === "Regional at Best" ? "-rab" : (song2.album === "TOPxMM" ? "-topxmm" : ""));
                    await channel.guild.channels.get("524287013357355018").setName(`${name1}-vs-${name2}`);
                    let reacts = ["1⃣", "2⃣"];
                    await m.react(reacts[0]);
                    await m.react(reacts[1]);
                    json.id = m.id;
                    await writeJsonFile("./json/songRank.json", json);
                }
            } else { //THIS ARR1 EMPTY, YEET
                json.songs.splice(json.arr1, 1);
                json.arr1 = null;
                json.arr2 = null;
                return chooseSong(true);
            }

        } else {
            await writeJsonFile("./json/songRank.json", json);
            console.log("choose song length 0");
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
        if (!reaction) return console.log("reaction undefined");
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
        const events = { MESSAGE_REACTION_ADD: "messageReactionAdd", MESSAGE_REACTION_REMOVE: "messageReactionRemove" };
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
            ytsr(query, {}, function (err, searchResults) {
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
