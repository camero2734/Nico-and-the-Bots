require("dotenv").config();
let Discord = require("discord.js-master");
const fs = require("fs"); require("dotenv").config();
const ytdl = require("ytdl-core");
const snekfetch = require("snekfetch");
const chalk = require("chalk");
const got = require("got");
const average = require("image-average-color");
const fontColorContrast = require("font-color-contrast");
const { createCanvas, loadImage, Image, registerFont } = require("canvas");
let bot = new Discord.Client({ autoReconnect: true });
bot.login(process.env.LISDEN_TOKEN);


const PREFIX = "!";
let skipvotes = 0;
let songNum = 0;
let dispatcher;
const musicChan = "470336762376355840";
const  musicDir = "./music/";

let SONGS = [];

function colorLog(toLog, color) {
    console.log(chalk.keyword(color)(toLog));
}

Discord.Message.prototype.command = function(name) {
    return (this.content.split(" ")[0] === PREFIX + name);
};

Discord.Message.prototype.argLength = function(num) {
    return (this.content.split(" ").length >= num);
};

Discord.Channel.prototype.embed = async function (content) {
    return new Promise(resolve => {
        this.send(new Discord.MessageEmbed({ description: content }).setColor("RANDOM")).then((m) => resolve(m));
    });
};

bot.on("ready", async () => {
    fs.readdir(musicDir, (err, files) => {
        if (err) console.log(err);
        for (const file of files) {
            fs.unlink(musicDir + file, err => {
                if (err) console.log(err);
            });
        }
    });
    colorLog("Music bot on!", "green");
});

bot.on("message", async (msg) => {

    if (!msg || msg.author.bot) return;
    msg.args = msg.content.split(" ");
    if (msg.command("play")) {
        if (!msg.argLength(2)) return msg.channel.embed("Please enter a URL or search term.");
        if (!isUrl(msg.content)) addSong(removeCommand(msg.content), msg.author.id, msg.channel, true);
        else addSong(msg.args[1], msg.author.id, msg.channel);
    }
    if (msg.command("skip")) {
        if (SONGS.length < 1) return msg.channel.embed("Nothing is playing!");  
        else if (canSkip(msg)) {
            console.log("calling dispatcher end from skip");
            dispatcher.end();
        }
        else voteSkip(msg);
    }
    if (msg.command("queue")) {
        sendQueue(msg.channel, msg.args[1] ? msg.args[1] : "1");
    }

    if (msg.content.startsWith("!")) console.log(msg.command("play"))
}); 

function isUrl(content) {
    return (content.indexOf("http") !== -1 && content.indexOf("youtu") !== -1);
}

function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

function padString(n) {
    return (n < 10 ? "0" + n : n);
}

function sendQueue(channel, page) {
    page--;
    let embed = new Discord.MessageEmbed().setColor("RANDOM").setAuthor("Music queue", bot.user.avatarURL);
    for (let i = page * 10; i < page * 10 + 10; i++) {
        if (SONGS[i]) {
            let song = SONGS[i];
            embed.addField(`[${i + 1}] ` + song.info.title, song.url);
        }
    }
    channel.send(embed);
}

function canSkip(msg) {
    if (SONGS[0] && SONGS[0].requesterID === msg.author.id) return true;
    else return false;
}

function voteSkip(msg) {
    if (msg.member.voice.channelID !== musicChan && msg.author.id !== "221465443297263618") return msg.channel.embed("You are not in the music voice channel so you cannot vote to skip.");
    skipvotes++;
    let vc = msg.guild.channels.get(musicChan);
    let required = Math.floor(vc.members.size * 0.6666);
    if (skipvotes >= required) {
        console.log("Calling dispatcher end from voteskip");
        dispatcher.end();
    }
    else msg.channel.embed(msg.member.displayName + ` has voted to skip the current song. ${required - skipvotes} more vote${(required - skipvotes === 1 ? " is" : "s are")} needed.`);
}


async function addSong(url, id, chan, search) {
    if (search) {
        let reqURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${url}&key=${process.env.YOUTUBE}`;
        let r = await snekfetch.get(reqURL);
        if (!r || !r.body || !r.body.items || !r.body.items[0] || !r.body.items[0].id) return msg.channel.embed("Error processing song.");
        url = "https://www.youtube.com/watch?v=" + r.body.items[0].id.videoId;
    }
    let song = new Song(url, id, chan);
    console.log("before attach1");
    let newSong = await attachInfo(song);
    console.log("after attach1");
    if (!newSong) return chan.embed("Invalid URL or search term.");
    else SONGS.push(song);
    sendInfo(newSong, true);
    if (SONGS.length === 1) playNext();
}

async function attachInfo(song) {
    if (typeof song === "undefined" || !song || song === "") return false;
    else {
        try {
            let info = await ytdl.getInfo(song.url);
            console.log(info, /INFOOOOO/);
            if (!info || !info.player_response || !info.player_response.videoDetails || info.player_response.videoDetails.lengthSeconds > 18000) {
                bot.guilds.get("269657133673349120").channels.get("470331990231744512").embed("The song requested is too long to play. Songs must be under 5 hours long.");
                return false;
            }

            colorLog("Downloading...", "magenta");

            
            let length = `${padString(Math.floor(info.player_response.videoDetails.lengthSeconds / 60))}:${padString(Math.floor(info.player_response.videoDetails.lengthSeconds - 60 * Math.floor(info.player_response.videoDetails.lengthSeconds / 60)))}`;
            let thumb = "https://pbs.twimg.com/profile_images/1642161716/music_logo.png";
            if (info && info.player_response && info.player_response.videoDetails && info.player_response.videoDetails.thumbnail && info.player_response.videoDetails.thumbnail.thumbnails && info.player_response.videoDetails.thumbnail.thumbnails[info.player_response.videoDetails.thumbnail.thumbnails.length - 1]) thumb = info.player_response.videoDetails.thumbnail.thumbnails[info.player_response.videoDetails.thumbnail.thumbnails.length - 1].url;
            if (typeof thumb === "undefined" || thumb === "") thumb = "https://pbs.twimg.com/profile_images/1642161716/music_logo.png";
            song.info = { title: info.player_response.videoDetails.title, author: { name: info.author.name, avatar: info.author.avatar, url: info.author.user_url }, length: length, thumbnail: thumb };

            var urlEnd = encodeUrl(info && info.player_response.videoDetails.title ? info.player_response.videoDetails.title.replace(/\(.*?\)|\[.*?\]/g, "") : "NAIOSFFAIOFJOITJTGJG9ASDJ903TFO;GJSDSDJ");
            let r = await snekfetch.get("https://api.genius.com/search?q=" + urlEnd, { headers: { Authorization: "Bearer HfRtuFR2txhAmu5c4EhBLoqHZWF9qUn5pgaDdYDky_tUHOLHYdBuJL3v28ugBUNV" } });
            if (r.body && r.body.response && r.body.response.hits && r.body.response.hits[0]) {
                song.info.albumArt = r.body.response.hits[0].result.song_art_image_thumbnail_url;
                song.info.geniusSong = r.body.response.hits[0].result.title;
                song.info.geniusArtist = r.body.response.hits[0].result.primary_artist.name;
            }
            return song;
        } catch(e) {
            console.log(e, /ATTACHINFO_ERR/);
            return false;
        }
    }
    
}

class Song {
    constructor(url, requesterID, channel) {
        this.url = url;
        this.requesterID = requesterID;
        this.file = "";
        this.id = songNum++;
        this.channel = channel;
    }

    async getBanner() {
        return new Promise(resolve => {
            let url = this.info.albumArt ? this.info.albumArt : "http://orig14.deviantart.net/5162/f/2014/153/9/e/no_album_art__no_cover___placeholder_picture_by_cmdrobot-d7kpm65.jpg";
            snekfetch.get(url).then((r) => {
                var canvas = createCanvas(500, 150);
                var ctx = canvas.getContext("2d");
                let album = new Image();
                album.src = r.body;
                getColorFromURL(url).then((color, err) => {
                    if (err) console.log(err);
                    console.log(color);
                    registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
                    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},255)`;
                    ctx.fillRect(0, 0, 700, 150);
                    ctx.drawImage(album, 13, 13, 125, 125);
                    color.pop();
                    ctx.fillStyle = fontColorContrast(color);
                    ctx.textAlign = "left";
                    ctx.font = "22px futura";
                    ctx.fillText(this.info.geniusSong, 150, 60);
                    ctx.font = "17px futura";
                    ctx.fillText(this.info.geniusArtist, 150, 110);
                    console.log(`rgba(${~~(color[0] / 4)},${~~(color[1] / 4)},${~~(color[2] / 4)},${color[3]})`);
                    ctx.fillStyle = `rgba(${~~(color[0] / 2)},${~~(color[1] / 2)},${~~(color[2] / 2)},255)`;
                    ctx.beginPath();
                    ctx.moveTo(250, 150);
                    ctx.lineTo(500, 75);
                    ctx.lineTo(500, 150);
                    ctx.fill();
    
                    resolve(canvas.toBuffer());
                });
    
    
            });
        });
        
    }
}

function encodeUrl(string) {
    return encodeURIComponent(string).replace(/'/g, "%27").replace(/"/g, "%22");
}

function removeCommand(content) {
    var array = content.split(" ");
    array.shift();
    var toReturn = array.join(" ");
    return toReturn;
}


async function playNext() {
    skipvotes = 0;
    let song = SONGS[0];
    console.log("before attach");
    if (!song.info) {
        let r = await attachInfo(song);
        if (!r) {
            SONGS.shift();
            return playNext();
        }
    }
    console.log("after attach");
    let voiceChannel = bot.guilds.get("269657133673349120").channels.get(musicChan);
    voiceChannel.join().then(async (vc) => {
        await sendInfo(song);
        console.log(song.url, /URL/);

        
        let stream = await ytdl(song.url, { quality: "highestaudio" });
        dispatcher = vc.play(stream, { bitrate: "auto" });
        
        dispatcher.on("error", (error) => {
            console.log(error, /DISERROR/);
            dispatcher.end();
        });
        dispatcher.on("end", (s) => {
            colorLog("Song ended!", "red");
            setTimeout(() => {
                voiceChannel.leave();
                if (typeof SONGS[1] === "undefined") {
                    SONGS.shift();
                    return song.channel.embed("Playback finished.");
                }
                else {
                    SONGS.shift();
                    playNext();
                }
            }, 500);
        });
    }).catch(e => {console.log(e, /ERRRROR/);});
}

async function getColorFromURL(url) {
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                const response = await got(url, { encoding: null });
                average(response.body, (err, col) => {
                    if (err) reject(err);
                    resolve(col);
                });
            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function sendInfo(song, queued) {
    let embed = new Discord.MessageEmbed().setColor("RANDOM");
    embed.setAuthor(song.info.author.name, song.info.author.avatar, song.info.author.url);
    if (!queued) embed.setTitle("Now playing: " + song.info.title);
    else embed.setTitle("Queued: "  + song.info.title);
    embed.setThumbnail(song.info.thumbnail);
    embed.addField("Link", song.url);
    embed.addField("Length", song.info.length);
    
    if (!queued) {
        let banner = await song.getBanner();
        embed.attachFiles(new Discord.MessageAttachment(banner, "banner.png"));
        embed.setImage("attachment://banner.png");
        await song.channel.send(embed).catch((e) => {console.log(e, /ERR/);});
    } else await song.channel.send(embed).catch((e) => {console.log(e, /ERR/);});
}

process.on("unhandledRejection", error => {
    console.log(error, /1/);
});

process.on("uncaughtException", error => {
    console.log(error, /2/);
});

bot.on("error", (err) => {
    console.log(err, /err/);
    let channel = bot.guilds.get("269657133673349120") ? bot.guilds.get("269657133673349120").channels.get("470406597860917249") : undefined;
    if (channel) channel.send(err.message + " (music)");
    if (channel) channel.send(err.toString());
});