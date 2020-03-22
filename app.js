geoGame = false;
//applyde
let openApps = {};
let pings = [];
//Quiet game
parsing = false;
interval = null;
sent = false;
closingProcess = false;
//Module imports
let myFunctions = require("./functions.js");
let nodechart = require("./nodechart.js");
const fs = require("fs");
const Canvas = require("canvas");
const storage = require("node-persist"); require("dotenv").config();
const got = require("got");
const Chart = require("chart.js");
const loadJsonFile = require("load-json-file");
const writeJsonFile = require("write-json-file");
const Discord = require("discord.js");
const chalk = require("chalk");
const NSFAI = require("nsfai");
const path = require("path");
const translate = require("google-translate-api");
const google = require("google");
const cheerio = require("cheerio");
const ypi = require("youtube-playlist-info");
const snekfetch = require("snekfetch");
const nodefetch = require("node-fetch");
const hotload = require("hotload");
const yauzl = require("yauzl-promise");
const morse = require("morse-node").create("ITU");
const color = require("color");
const pm2 = require("pm2");
const fuzzyMatch = require("fuzzaldrin").filter;
const friendlyTime = require("friendly-time");
const chrono = require("chrono-node");
const Fuse = require("fuse.js");

//SQLITE
global.typeorm = require("typeorm");
fs.readdirSync("./app/model").forEach(file => {
    let fileName = file.split(".")[0];
    console.log(chalk.yellow.bold("LOADING MODEL " + fileName));
    global[fileName] = require("./app/model/" + file);
});

//Function definitions
(async function () { await storage.init(); })();
function requireFunction(name) { return require(`./Functions/${name}.js`); };
function wrap(t) { return ("```" + t + "```"); };
async function chooseKey() { let keys = chans.keys; let found = false; for (let key of keys) { console.log(key); await new Promise(next => { let currentKey = nsfai.app._config.apiKey; if (!found) { nsfai = new NSFAI(key); nsfai.predict("https://thebalancedplate.files.wordpress.com/2008/05/bagel-group.jpg").then(() => { found = true; next(); }).catch(e => { console.log(e.data); next(); }); } else next(); }); } if (!found) bot.guilds.get("269657133673349120").channels.get("470406597860917249").send("All NSFW keys have run out."); console.log(chalk.blueBright("Key chosen: " + nsfai.app._config.apiKey)); }
function runFunctions(guild) { remindersTimeoutCheck(guild); registerCommands(); removeNew(guild); songDiscussion(guild); updateConcerts(guild, Discord); checkEvents(guild, Discord); };
Number.prototype.map = function (in_min, in_max, out_min, out_max) { return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min; };
async function delay(ms) { return new Promise(resolve => { setTimeout(() => { resolve(); }, ms); }); }

//Function imports
const remindersTimeoutCheck = requireFunction("remindersTimeoutCheck");
const findCommand = requireFunction("findCommand");
const sendMsgStats = requireFunction("sendMsgStats");
const resetrecap = requireFunction("resetrecap");
const shuffle = requireFunction("shuffle");
const padStr = requireFunction("padStr");
const removeCommand = requireFunction("removeCommand");
const lotteryCheck = requireFunction("lotteryCheck");
const dm = requireFunction("dm");
const sendTopfeedBot = requireFunction("sendTopfeedBot");
const canKick = requireFunction("canKick");
const fairlyused = requireFunction("fairlyused");
const votefunc = requireFunction("votefunc");
const Base64 = requireFunction("base64");
const handleReaction = requireFunction("reactions");
const staffUsedCommand = requireFunction("staffUsedCommand");
const givePoints = requireFunction("givePoints");
const checkNSFW = requireFunction("checkNSFW");
const embed = requireFunction("embedBase");
const removeNew = requireFunction("removeNew");
const checkReq = requireFunction("deRequirements");
const checkDE = requireFunction("checkDE");
const songDiscussion = requireFunction("songDiscussion");
const updateConcerts = requireFunction("updateConcerts");
const checkEvents = requireFunction("checkEvents");
const hog = requireFunction("houseofgold");
const wordCount = requireFunction("wordCount");
const askQuestion = requireFunction("askQuestion");
const quietGame = requireFunction("quietGame");
const staffDEResponse = requireFunction("staffDEResponse");
const artistSubmissions = requireFunction("artistSubmissions");
const messageToImage = requireFunction("messageToImage");
const interviewSubmissions = requireFunction("interviewSubmissions");
const overlayImage = requireFunction("overlayImage");
const banHandler = requireFunction("banHandler");
const handleReacts = requireFunction("handleReacts");
const fmStarSystem = requireFunction("fmStarSystem");
storage.entries = requireFunction("entries");
Discord.Channel.prototype.awaitMessage = requireFunction("awaitMessage");
String.prototype.startsWithP = requireFunction("startsWithP");
Discord.Channel.prototype.embed = requireFunction("embed");
Discord.GuildMember.prototype.hasRole = requireFunction("hasRole");
Discord.TextChannel.prototype.setSlowmode = requireFunction("setSlowmode");
Discord.TextChannel.prototype.getSlowmode = requireFunction("getSlowmode");
Discord.Message.prototype.removeCommand = requireFunction("removeCommandProto");
Discord.Message.prototype.getEmojis = requireFunction("getEmojis");

//JSON files
let chans = loadJsonFile.sync("channels.json");
Discord.chans = chans;
let cookie = loadJsonFile.sync("cookies.json");
let profiles = loadJsonFile.sync("profiles.json");
let tags = loadJsonFile.sync("tags.json");
let boostEmojiJSON = loadJsonFile.sync("./json/boostemoji.json");
let earned = loadJsonFile.sync("earnedbadges.json");
let autoreactJSON = loadJsonFile.sync("./json/autoreact.json");

//Class instantiation/initiation
const bot = new Discord.Client({ autoReconnect: true, max_message_cache: 0, fetchAllMembers: true });
var nsfai = new NSFAI(chans.keys[0]);

//Variables
const prefix = "!";
let poot = "221465443297263618";
var fairlycankick = false;

//Arrays
const swearWords = chans.swearWords;
let safeswears = chans.safeSwears;
var del = [];
var currentvote = [];
var votes = [];
var voted = [];
var asked = [];
let commands = [];
var muted = [];
let numberGames = [];
let logQueue = [];

//Command that runs commands within global scope
Discord.Message.prototype.runCommand = function (name) {
    command = hotload("./Commands/" + name + ".js", () => {});
    let fnctn = command.execute.toString();
    console.log("Command: " + chalk.green(name));
    eval("toRun = " + fnctn);
    toRun(this, this.args);
};

//Role IDs
const TRENCH = "466627343520104449";
const BF = "319620325224480768";
const VSL = "319620276692451328";
const RAB = "319620417486716940";
const ST = "319620372305543168";
const NPI = "319632312654495754";
const TO = "278225702455738368";

//PRELOAD
(async function () {
    let entities = [];
    let files = await fs.promises.readdir("./app/entity");
    files.forEach(async (file) => {
        let fileName = file.split(".")[0];
        console.log(chalk.red.bold("LOADING ENTITY " + fileName));
        entities.push(await require("./app/entity/" + file));
    });
    global.connection = await typeorm.createConnection({
        type: "sqlite",
        database: "discord.sqlite",
        synchronize: true,
        logging: false,
        entities: entities
    });
    await connection.manager.query("PRAGMA busy_timeout=10000;");
    console.log(chalk.bold("CONNECTION MADE"));
    bot.login(process.env.NICO_TOKEN);
})();

//Actual bot stuff
bot.on("ready", async () => {
    if (!tags["despacito"]) tags = JSON.parse(tags);
    console.log(`Logged in as ${bot.user.tag}!`);
    let guild = bot.guilds.get("269657133673349120");
    chooseKey();
    console.log("going to run functions");
    runFunctions(guild);
    bot.user.setPresence({ game: { name: guild.memberCount + " members" } });
    let announceRole = guild.roles.get("357682068785856514");
    if (announceRole.mentionable) await announceRole.setMentionable(false);
    if (guild.channels.get("470406597860917249")) guild.channels.get(chans.bottest).embed("Nico is on fire");
    lotteryCheck(guild);
    setInterval(async () => {
        let currentTime = Date.now();
        let goldLength = 86400000 * 7; // 1 WEEK

        // let users = guild.roles.get("386969744709910530").members.array();
        // console.log(users.length + " users");

        let goldTimes = await connection.getRepository(Counter).find({ title: "GoldCount", lastUpdated: typeorm.Between(1, currentTime - goldLength) });
        for (let counter of goldTimes) {
            counter.lastUpdated = 0;
            let goldMem = guild.members.get(counter.id);
            try {
                await goldMem.removeRole("386969744709910530");
            } catch (e) {
                console.log(/ge/);
                if (counter.id === "303234365163438081") console.log("found diana");
            } finally {
                await connection.manager.save(counter); //Remove no matter what
            }

        }
    }, 1000 * 1000);
    writeJSONFiles();
});

async function writeJSONFiles() {
    if (!fs.queue) fs.queue = [];
    if (fs.queue.length > 0) {
        let { path, data } = fs.queue.shift();
        if (data && data !== undefined && typeof data === "string") {
            console.log(chalk.red(`WRITING ${path} [${fs.queue.length}]`));
            await fs.promises.writeFile(path, data);
        } else {
            console.log(chalk.red.bold("Undefined WRITE for " + path));
        }
    } else await delay(100);
    return writeJSONFiles();
}

fs.writeFileQueued = async function (path, data) {
    if (!fs.queue) fs.queue = [];
    if (closingProcess) return;
    if (typeof data === "object") data = JSON.stringify(data);
    for (let i = 0; i < fs.queue.length; i++) {
        if (fs.queue[i].path === path) return fs.queue[i].data = data; //Just write updated file instead
    }
    fs.queue.push({ path, data });
};

fs.readFileAsync = async function (path) {
    if (closingProcess) return;
    try {
        let data = await fs.promises.readFile(path);
        data = JSON.parse(data);
        return data;
    } catch (e) {
        await bot.guilds.get("269657133673349120").channels.get(chans.bottest).send("<@221465443297263618> error in " + path + ", overwriting...");
        fs.writeFileQueued(path, {});
        return {};
    }
};


bot.on("error", (err) => {
    console.log(err, /err/);
    let channel = bot.guilds.get("269657133673349120") ? bot.guilds.get("269657133673349120").channels.get("470406597860917249") : undefined;
    if (channel) channel.send(err.message + " (app)");
    if (channel) channel.send(err.toString());
});

//Manually emit an event for reactions on messages sent before the bot was turned on
const events = { MESSAGE_REACTION_ADD: "messageReactionAdd", MESSAGE_REACTION_REMOVE: "messageReactionRemove" };
bot.on("raw", async event => {
    if (!events.hasOwnProperty(event.t)) return;
    const { d: data } = event; const user = bot.users.get(data.user_id); const channel = bot.channels.get(data.channel_id) || await user.createDM();
    if (channel.messages.has(data.message_id)) return;
    const message = await channel.fetchMessage(data.message_id);
    const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
    const reaction = message.reactions.get(emojiKey);
    bot.emit(events[event.t], reaction, user);
});

//Make the announcements role pingable if someone starts typing in #announcements
bot.on("typingStart", async (channel, user) => {
    let topfeedChannels = ["470428804695851008", "534882732820529174", "534882758770688031", "534882714566918174", "534882701963034624", "534882770619465731"];
    if (channel.id === chans.announcements) {
        let announceRole = channel.guild.roles.get("357682068785856514");
        if (!announceRole.mentionable) {
            await announceRole.setMentionable(true);
            await delay(1000 * 60 * 2);
            if (announceRole.mentionable) announceRole.setMentionable(false);
        }
    } else if (channel.id === chans.fairlyannouncements) {
        let deathRole = channel.guild.roles.get("283272728084086784");
        if (!deathRole.mentionable) {
            await deathRole.setMentionable(true);
            await delay(1000 * 60 * 2);
            if (deathRole.mentionable) deathRole.setMentionable(false);
        }
    }
    // else if (topfeedChannels.indexOf(channel.id) !== -1) {
    //     //TYLER, JOSH, BAND, [JEN,DEB,JIM], OTHER, DMAORG, YOUTUBE
    //     let roleIDS = ["534890883016032257", "534890899323224064", "534890910526472202", ["534890933301542912", "535588989713907713", "534890931573358623"], "534890940343779328", "534890903664328714", "538224831779307534"];
    //     switch (channel.id) {

    //     }

    //     for (let id of roleIDS) {
    //         let role = msg.guild.roles.get(id);
    //         if (!role) continue;
    //         await role.setMentionable(true);
    //     }
    // }
});

//Add or remove the VC role
bot.on("voiceStateUpdate", (oldM, newM) => {
    if (oldM.voiceChannel && typeof newM.voiceChannel === "undefined") newM.removeRole("465268535543988224");
    if (typeof oldM.voiceChannel === "undefined" && newM.voiceChannel) newM.addRole("465268535543988224");
});

//Give people points for their messages and log messages (exp)
bot.on("message", async message => {
    if (message.author.bot) return;
    if (message.channel.type !== "text" && message.channel.type !== "news") return;

    let m = new MessageLog(message.author.id, message.channel.id, message.id, message.createdTimestamp);
    await connection.manager.save(m);

    let disallowedChannels = [chans.memes]; // Specific channels
    let disallowedCategories = [chans.staff, chans.staffventing, chans.submittedsuggestions, chans.commands, chans.incall]; // Category that contains listed channels

    disallowedCategories = disallowedCategories.map(c => message.guild.channels.get(c).parentID);

    message.disallowedChannels = disallowedChannels;
    message.disallowedCategories = disallowedCategories;

    await givePoints(message, connection, Discord);
});

//Deleted Messages logger
bot.on("messageDelete", message => {
    if (message.channel.id === chans.suggestions) return;
    if (message.author.bot) return;
    if (message.content.startsWith(prefix + "suggest")) return;
    if (message.content.startsWith(prefix + "bmeme")) return;
    if (message.content.startsWith("babadook")) return;
    if (message.content.startsWith(prefix + "delete")) return;
    if (message.content.startsWith(prefix + "tag")) return;
    if (message.channel.type === "dm") return;
    let guild = message.guild;
    if (!message) return;
    let whodunit = "!";
    message.guild.fetchAuditLogs({ type: "MESSAGE_DELETE" }).then((audit) => {
        let arr = audit.entries.array();
        let deletefound = false;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] && arr[i].target && arr[i].target.id === message.author.id && !deletefound) {
                let deletedAudit = audit.entries.first();
                if (deletedAudit.action === "MESSAGE_DELETE") {
                    whodunit = " by " + deletedAudit.executor.username;
                }
                if ((message.content.indexOf("welcome") !== -1) && (message.content.indexOf("hell") !== -1)) return;
                myFunctions.sendembed(message, guild.channels.get(chans.deletelog), "Message deleted" + whodunit, false, 16776960);
                deletefound = true;
            }
        }
    });
});

//Death eater message
bot.on("guildMemberUpdate", (oldM, newM) => {
    if (!oldM.roles.get("283272728084086784") && newM.roles.get("283272728084086784")) newM.guild.channels.get(chans.fairlyannouncements).embed(newM.displayName + " has added death to their diet.");
});

//Member count
bot.on("guildMemberAdd", member => {
    if (member.guild.id !== "269657133673349120") return;
    let guild = member.guild;
    // guild.defaultChannel.send("Salutations, " + member.user + "! Welcome to the /r/twentyonepilots Discord! For an overview of the server and some useful commands, check out <#314572694794272768>  |-/");

    //update bot status
    var members = guild.members.array();
    bot.user.setPresence({ game: { name: guild.memberCount + " members" } });
    //

});
bot.on("guildMemberRemove", member => {
    if (member.guild.id !== "269657133673349120") return;
    let guild = member.guild;
    //update bot status
    var members = guild.members.array();
    bot.user.setPresence({ game: { name: guild.memberCount + " members" } });
    //
    member.guild.channels.get(chans.deletelog).fetchPinnedMessages().then((data) => {
        var arra = data.array();
        if (arra && arra[arra.length - 1]) arra[arra.length - 1].unpin();
        guild.channels.get(chans.deletelog).send("```User " + member.user.username + " has left the server```").then(message => {
            message.pin();
        });
    });

});

//Message event
bot.on("message", async msg => {
    let d = Date.now() + msg.author.id;
    if (msg.channel.id === chans.houseofgold) return hog(msg, Discord);
    msg.commandName = msg.content.split(" ")[0].substring(1);
    let rip = msg.content.toLowerCase();
    if (msg.content === "fuck js") msg.delete(); //x2's bot does this it's annoying, good bye!
    if (msg.author.bot) return; //This would end badly

    if (msg.author.id === "349728613521817600" && msg.channel.id === "470337593746259989" && msg.content.toLowerCase() === "ok") {
        msg.channel.send("ok jenn");
    }

    if ((msg.channel.type === "dm" && msg.content.endsWith("??")) || msg.channel.id === chans.submittedsuggestions) askQuestion(msg, Discord);
    if (msg.channel.id === "554046505128951833") {
        bot.Discord = Discord;
        return quietGame(msg, bot, Canvas);
    }


    if (msg.content.startsWith("$image")) return msg.runCommand("image");
    //NSFW CHECKER
    let sfw = true;
    if (msg && msg.member && !msg.content.startsWith(prefix + "nsfw") && !msg.author.bot && msg.author.id !== bot.user.id && msg.author.id !== poot) sfw = await checkNSFW(msg, false, nsfai);
    if (sfw === "error") await chooseKey();
    if (!sfw) return;

    //Delete any !suggest messages in #suggestions
    if (msg.channel.id === chans.suggestions && msg.content.startsWith(prefix) && !msg.content.toLowerCase().startsWith(prefix + "suggest") && msg.author.id !== poot) return msg.delete();

    //daily recap
    if (msg && msg.member && 1 == 2) { //TODO: Fix
        let epoch = new Date(2019, 6, 1); //JULY 1ST 2019
        let startOfToday = (new Date()).setHours(0, 0, 0, 0);
        let today = Math.round(Math.abs((epoch.getTime() - startOfToday) / (24 * 60 * 60 * 1000)));
        let preRP = await connection.getRepository(Recap).findOne({ id: msg.author.id, day: typeorm.Not(today) });

        if (!preRP) { // JUST ADD
            let newRP = new Recap(msg.author.id, msg.channel.id, today, Date.now());
            await connection.manager.save(newRP);
        } else {
            console.log("Recap for " + msg.member.displayName);
            let recaps = await connection.getRepository(Recap).find({ id: msg.author.id, day: typeorm.Not(today) });
            try {
                await connection.manager.remove(recaps);
            } catch (e) {
                console.log(chalk.red.bold(`Too many recap rows for ${msg.member.displayName}, removing 500 at a time...`));
                for (let i = 0; i < recaps.length; i += 500) {
                    let sliced = recaps.slice(i, i + 500);
                    await connection.manager.remove(sliced);
                }
                console.log(chalk.red.bold("Deleted all rows!"));
            }
            if (msg.member.roles.get("402948433301733378") && recaps.length > 0) {
                let recap_json = { day: today - 1 };
                for (let rc of recaps) {
                    if (!recap_json[rc.channel]) recap_json[rc.channel] = 0;
                    recap_json[rc.channel]++;
                }
                msg.Discord = Discord;
                msg.Canvas = Canvas;
                msg.Chart = Chart;
                await resetrecap(msg, recap_json, recaps);
            }

            let weekRecap = await connection.getRepository(WeekRecap).findOne({ id: msg.author.id });
            if (!weekRecap) weekRecap = new WeekRecap(msg.author.id, "[]", today - 1);

            let arr = JSON.parse(weekRecap.days ? weekRecap.days : "[]");
            let daysSkipped = today - weekRecap.lastDay - 1;
            for (let i = 0; i < daysSkipped; i++) arr.push(0);
            arr.push(recaps.length);
            weekRecap.days = JSON.stringify(arr.slice(-7));
            weekRecap.lastDay = today;
            await connection.manager.save(weekRecap);

        }

    }
    //emoji reactor 3.0
    let finalemojis = [];
    if (!msg.author.bot && (msg.content.indexOf("---") !== -1 || msg.channel.id === chans.polls || msg.channel.id === "470796768720846858")) {
        finalemojis = msg.getEmojis();
    }
    if (finalemojis.length > 0) {
        (async function () {
            for (let emoji of finalemojis) {
                await new Promise(next => {
                    if (!emoji.emoji) next();
                    else try { msg.react(emoji.emoji).then(() => next()).catch(err => next()); } catch (err) { next(); }
                });
            }
        })();
    }

    //collections creations like
    if (msg.channel.id === chans.collections || msg.channel.id === chans.creations) {
        if (msg.attachments.array().length !== 0) {
            msg.react("%E2%9D%A4");
        }
    }

    //Hall of Fame upvote/ downvote
    if (msg.channel.id === chans.halloffame || msg.channel.id === chans.hiatusmemes || msg.channel.id === chans.theorylist) {
        if (msg.attachments.array().length === 0 && (msg.channel.id === chans.halloffame || msg.channel.id === chans.hiatusmemes)) msg.delete();
        else {
            msg.react("%E2%AC%86").then(() => {
                msg.react("%E2%AC%87");
            });
        }
    }

    //Handle messages differently if it's a dm
    if (msg.channel.type === "dm") {
        if (msg.content.toLowerCase() === prefix + "endbreak") msg.runCommand("endbreak");
        if (msg.content.toLowerCase() === "i agree leaks-theories" || msg.content.toLowerCase() === "i agree leaks theories" || msg.content.toLowerCase() === "i agree leakstheories") {
            msg.channel.send({ embed: new Discord.RichEmbed({ description: "You now have access to #leaks-theories!\n\nAs a side note, if you want to be pinged in the server as soon as the band tweets, posts to IG, or uploads a YT video, use the command **!topfeed** in #commands to be notified!" }) }).then(() => {
                let theguild = bot.guilds.get("269657133673349120");
                let member = theguild.members.get(msg.author.id);
                member.addRole("384543869917855744");
            });
            return;
        }
        return;
    }

    //Umm
    if (rip.indexOf("poot hates the gays") !== -1) {
        let gRole = "492903807282577408";
        if (!msg.member.roles.get(gRole)) {
            let user = msg.author;
            user.createDM().then(DMCHannel => {
                DMCHannel.send("Congratulations! You won the `Poot hates the Gays` badge!\n*Please note poot doesn't actually hate the gays*");
                DMCHannel.sendFile("./badges/poothatesthegays.png");
            });
            msg.member.addRole(gRole);
        }
    }
    //Some filters
    if ((rip.indexOf("welcome") !== -1) && (rip.indexOf("to") !== -1) && (rip.indexOf("hell") !== -1)) msg.delete();

    let topfeedChannels = ["470428804695851008", "534882732820529174", "534882758770688031", "534882714566918174", "534882701963034624", "534882770619465731"];
    if (topfeedChannels.indexOf(msg.channel.id) !== -1 && msg.member.roles.get("330877657132564480") && !msg.author.bot) {
        msg.bot = bot;
        msg.Discord = Discord;
        return sendTopfeedBot(msg);
    }

    swearWords.forEach((s, i) => {
        let swearPos = msg.content.toLowerCase().indexOf(s);
        if (swearPos !== -1) {
            let misfires = ["klondike", "retardant"];
            let falseFlag = false;
            for (let m of misfires) {
                if (msg.content.toLowerCase().indexOf(m) === swearPos || (m.indexOf(s) !== -1 && msg.content.toLowerCase().indexOf(m) !== -1)) falseFlag = true;
            }
            if (!falseFlag && msg.channel.type !== "dm") {
                msg.channel.send("Please refrain from using slurs. A copy of your message has been sent to the Admins.\n`Slur used: " + safeswears[i] + "`");
                myFunctions.sendembed(msg, msg.guild.channels.get(chans.slurlog), "Slurs detected!", false, 16711680);
            }
        }
    });
    for (let i = 0; i < swearWords.length; i++) { //Slurs are bad mmk

    }

    //The glorious prefix check
    if (!msg.content.startsWith(prefix)) return;

    //Channels that you can use commands in, commands that can be used in any channel, and roles that override everything
    let allowedChannels = [chans.bottest, chans.commands, chans.suggestions, chans.venting, chans.staff, chans.laxstaff];
    let allowedCommands = ["spoiler", "tag", "stayalive", "fm", "fm2", "chart", "weekly", "geo", "test"];
    let allowedRoles = ["330877657132564480"];
    let allowedPairs = [{ chan: chans.lyrics, command: "randomlyric" }, { chan: chans.fairlylocals, command: "tag" }, { chan: chans.fairlylocals, command: "qa" }];
    let hasAllowedRole = false;
    for (let role of allowedRoles) { if (msg.member.roles.get(role)) hasAllowedRole = true; }

    //Please use commands in #commands
    if (allowedChannels.indexOf(msg.channel.id) === -1 && allowedCommands.indexOf(msg.commandName) === -1 && !hasAllowedRole) {
        let allowed = false;
        for (let pair of allowedPairs) if (pair.chan === msg.channel.id && pair.command === msg.commandName) allowed = true;
        if (!allowed) {
            msg.delete();
            return msg.channel.embed("Please use commands in <#" + chans.commands + ">").then((m) => m.delete(5000));
        }
    }

    //Command use logger for badges TODO: Delete maybe?
    // ;(async function () {
    //     let preCount = await connection.getRepository(Counter).findOne( {id: msg.author.id, title: "CommandsUsed"} );
    //     if (!preCount) {
    //         preCount = new Counter(msg.author.id, "CommandsUsed", 0);
    //     }
    //     preCount.count++;
    //     await connection.manager.save(preCount);

    //     if (!earned[msg.author.id]) earned[msg.author.id] = {};
    //     if (preCount.count >= 25 && !earned[msg.author.id]['commandsused25']) {
    //         dm(msg, 'You earned the `25 commands used badge!`', './badges/25_cmd.png');
    //         if (!earned[msg.author.id]) earned[msg.author.id] = {};
    //         earned[msg.author.id]['commandsused25'] = true;
    //         fs.writeFileQueued("earnedbadges.json", earned);
    //     }
    //     if (preCount.count >= 50 && !earned[msg.author.id]['commandsused50']) {
    //         dm(msg, 'You earned the `50 commands used badge!`', './badges/50_cmd.png');
    //         if (!earned[msg.author.id]) earned[msg.author.id] = {};
    //         earned[msg.author.id]['commandsused50'] = true;
    //         fs.writeFileQueued("earnedbadges.json", earned);
    //     }
    //     if (preCount.count >= 100 && !earned[msg.author.id]['commandsused100']) {
    //         dm(msg, 'You earned the `100 commands used badge!`', './badges/100_cmd.png');
    //         if (!earned[msg.author.id]) earned[msg.author.id] = {};
    //         earned[msg.author.id]['commandsused100'] = true;
    //         fs.writeFileQueued("earnedbadges.json", earned);
    //     }
    // })();
    //Actually find and use the command (Commands are stored in /Commands/)
    let cP = msg.content.split(" ");
    let com = cP[0].toLowerCase().replace(prefix, "");
    let command = findCommand(com, commands);
    if (command) {
        command.initiate(msg);
    } else {
        findClosestCommand(msg); //Did you mean... ?
    }

});

//Add command objects to an array
function registerCommands() {
    class Command {
        /**
         * Creates a command
         * @param name - Sets command name. Takes a string or an array of aliases
         * @param {String} description - Command description
         * @param {Number} minarg - Minimum arguments required.
         * @param {String} example - Example of command in use
         * @param {String} category = Info, Basic, Fun, Staff, Other, Tags, Roles, Voting, Profile, Music
         */
        constructor(name, description, minarg, example, category) {
            this.name = name;
            this.aliases = false;
            this.category = category;
            if (Array.isArray(name)) {
                this.name = name[0];
                this.aliases = name;
            }
            this.description = description;
            this.minarg = minarg;
            this.example = example;
            this.inputfunction = function (msg) { msg.runCommand(this.name); };
            commands.push(this);
        }
        initiate(msg) {
            let cP = msg.content.split(" ");
            if (cP.length < parseInt(this.minarg) && parseInt(this.minarg) > 0) {
                this.embed(msg);
                return;
            }
            msg.args = cP;
            this.inputfunction(msg, cP);
        }
        embed(msg) {
            let embed = new Discord.RichEmbed();
            embed.setTitle(this.name.toUpperCase());
            embed.addField("Description:", this.description);
            embed.addField("Usage:", this.example);
            if (this.aliases && Array.isArray(this.aliases)) {
                let aliasstring = "";
                for (let alias of this.aliases) aliasstring += alias + ", ";
                embed.addField("Aliases:", aliasstring.substring(0, aliasstring.length - 2));
            }
            embed.setColor("#" + ("000000" + Math.random().toString(16).slice(2, 8).toUpperCase()).slice(-6));
            embed.setFooter("[] = required () = optional. Use !commands for more commands");
            msg.channel.send({ embed: embed });
        }

        isNamed(commandName) {
            if (Array.isArray(this.aliases)) return this.aliases.some(alias => { return (commandName.toLowerCase() === alias.toLowerCase()); });
            else return (commandName.toLowerCase() === this.name.toLowerCase());
        }

    }
    fs.readdirSync("./Commands").forEach(file => {
        if (file.endsWith("disabled")) return;
        let commandName = file.split(".")[0];
        let info = require("./Commands/" + file).info;
        if (!info) console.log(chalk.red("No info for " + commandName));

        if (!info.disable) {
            let name = (info.aliases) ? info.aliases : commandName;
            let description = (info && info.description) ? info.description : "No description provided";
            let minarg = (info && info.minarg) ? info.minarg : 0;
            let example = (info && info.example) ? info.example : "!" + commandName;
            let category = (info && info.category) ? info.category : "Other";
            new Command(name, description, parseInt(minarg), example, category);
        }
    });
    return;
}

bot.on("messageUpdate", (oMessage, nMessage) => {
    if (nMessage.author.bot) return;
    let xd = nMessage.content.toLowerCase();
    if (nMessage.content.indexOf("http:") !== -1) return;
    if (oMessage.content === nMessage.content) return;
    var stringy = oMessage;
    if (nMessage && nMessage.guild) myFunctions.sendembed(nMessage, nMessage.guild.channels.get(chans.deletelog), "Message edited!", oMessage, 9895829);

    for (let i = 0; i < swearWords.length; i++) {
        let rip2 = nMessage.content.toLowerCase();
        if (rip2.includes(swearWords[i])) {
            let rip = rip2;
            let guild = nMessage.guild;
            let swearPos = rip.indexOf(swearWords[i]);
            let misfires = ["klondike", "retardant"];
            let falseFlag = false;
            for (let m of misfires) {
                if (rip.indexOf(m) === swearPos || (m.indexOf(swearWords[i]) !== -1 && rip.indexOf(m) !== -1)) falseFlag = true;
            }
            if (!falseFlag) {
                if (nMessage.channel.type !== "dm") {
                    nMessage.channel.send("Please refrain from using slurs. A copy of your message has been sent to the Admins.\n`Slur used: " + safeswears[i] + "`");
                }
                myFunctions.sendembed(nMessage, nMessage.guild.channels.get(chans.slurlog), "Slurs detected!", false, 16711680);
            }
        }
    }

});

async function handleFMReaction(reaction, user, msg, currentRow) {
    let reactions = await msg.reactions.array();

    if (reaction) {
        for (let _r of reactions) {
            if (_r.emoji.name !== reaction.emoji.name) await _r.remove(user);
        }
    }


    let reactionArray = ["664678209157333016", "664678208981172225", "664678208578256908"].map(em => reactions.find(re => re.emoji.id === em));

    getUsers = async (re) => (await re.fetchUsers()).array().filter(u => !u.bot).map(u => u.id);

    let userArray = [];

    for (let i in reactionArray) userArray[i] = await getUsers(reactionArray[i]);

    let currentJSON = JSON.parse(currentRow.title);
    currentJSON.upvotes = userArray[0];
    currentJSON.downvotes = userArray[1];
    currentJSON.unknowns = userArray[2];
    currentRow.title = JSON.stringify(currentJSON);

    await connection.manager.save(currentRow);
}



let recentReactions = [];

bot.on("messageReactionRemove", async (reaction, user) => {
    let msg = await reaction.message.guild.channels.get(reaction.message.channel.id).fetchMessage(reaction.message.id);

    if (msg.channel.id === chans.topfeed) return;

    if (!user.bot && msg.embeds && msg.embeds[0] && msg.embeds[0].author && msg.embeds[0].author.name.endsWith("scrobbles") && msg.embeds[0].title.endsWith("'s FM")) {
        let currentRow = await connection.getRepository(Item).findOne({ id: msg.id, type: "FMVote" });
        if (!currentRow || !currentRow.title) return;
        return await handleFMReaction(null, user, msg, currentRow);
    }
});

bot.on("messageReactionAdd", async (reaction, user) => {
    let msg = await reaction.message.guild.channels.get(reaction.message.channel.id).fetchMessage(reaction.message.id);


    if (msg.channel.id === chans.topfeed) return;

    if (!user.bot && msg.embeds && msg.embeds[0] && msg.embeds[0].author && msg.embeds[0].author.name.endsWith("scrobbles") && msg.embeds[0].title.endsWith("'s FM")) {
        let currentRow = await connection.getRepository(Item).findOne({ id: msg.id, type: "FMVote" });
        console.log(msg.id, currentRow, /currentRow/)
        if (!currentRow || !currentRow.title) return;
        return await handleFMReaction(reaction, user, msg, currentRow);
    }

    for (let i = recentReactions.length - 1; i >= 0; i--) {
        if (Date.now() - recentReactions[i].time > 5000) recentReactions.splice(i, 1);
        else if (recentReactions[i].id === msg.id + user.id) return;
    }

    recentReactions.push({ id: msg.id + user.id, time: Date.now() });

    if (msg.channel.id === chans.interviewsubmissions && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && !user.bot) {
        return interviewSubmissions(reaction, user, Discord);
    }

    if (reaction.emoji.name === "🤡" && msg.channel.permissionsFor(user).has("SEND_MESSAGES")) {
        let allowedChannels = [chans.bottest, chans.commands, chans.suggestions, chans.fairlylocals, chans.venting];
        if (allowedChannels.indexOf(msg.channel.id) === -1 && !msg.guild.members.get(user.id).roles.get("283272728084086784") && !msg.guild.members.get(user.id).roles.get("330877657132564480")) return;
        let buffer = await messageToImage(msg, 856, 480);
        if (!buffer) return;
        //await msg.channel.send(new Discord.Attachment(buffer, "img.png"));
        msg.specialAttachment = buffer;
        await msg.runCommand("clown");
    }

    if (reaction.emoji.name === "💣" && msg.content && msg.content.startsWith("Minesweeper")) {
        if (!msg.content.endsWith(user.id)) return;
        else {
            let newText = msg.content.replace(/\|/g, "");
            msg.edit(newText);
        }
    }
    if (reaction.emoji.name === "☑" && msg.channel.type === "dm") {
        console.log("ya");
        if (msg.embeds && msg.embeds[0] && msg.embeds[0].footer && msg.embeds[0].footer.text === "Feel free to respond with another question, or react with ☑️ to say thanks!") {
            console.log("aaa");
            msg.channel.embed("Thanks sent!");
            let thanksEmbed = new Discord.RichEmbed().setAuthor(user.username, user.displayAvatarURL).setColor("RANDOM").setDescription("Said thanks!");
            bot.guilds.get("269657133673349120").channels.get(chans.submittedsuggestions).send(thanksEmbed);
        }

    }
    if ((reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && msg.author.bot && !user.bot && msg.channel.id === chans.artistsubmissions) {
        return artistSubmissions(reaction, user, Discord);
    }

    if ((reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && msg.author.bot && !user.bot && msg.channel.id === chans.deapplications) {
        return staffDEResponse(reaction, user, Discord);
    }
    handleReaction(reaction, user).then(async (r) => {
        let response = (r && r.obj) ? r.obj : null;
        let type = (r && r.type) ? r.type : null;
        if (type === "strike") {
            // Outdated
            return;
            // strikes = response;
            // handleStrike(msg, strikes[msg.author.id][msg.channel.id].count);
            // staffUsedCommand(user.username, "Strike ❌", "#ee3647", { User_striked: msg.author.toString(), channel: msg.channel.toString(), strike_num: strikes[msg.author.id][msg.channel.id].count, time: (new Date()).toString() });
        } else if (type === "updownvote") {
            msg.delete();
            msg.guild.channels.get(chans.bottest).send("Message deleted by bot!\n" + response[0] + " likes\n" + response[1] + "dislikes");
            msg.guild.channels.get(chans.bottest).send(msg.member.displayName);
        } else if (type === "repost") {
            msg.delete();
            msg.guild.channels.get(chans.bottest).embed(`Message in <#${chans.trenchmemes}> deleted for being a repost`);
        } else if (type === "gold") {
            let embed = response;
            let preGD = await connection.getRepository(Counter).findOne({ id: msg.author.id, title: "GoldCount" });
            if (!preGD) {
                preGD = new Counter(msg.author.id, "GoldCount", 0, 0);
            }
            preGD.count++;
            preGD.lastUpdated = Date.now();
            await connection.manager.save(preGD);
            let finalNum = null;
            if (preGD.count === 5 || preGD.count === 10 || preGD.count == 25) finalNum = preGD.count;
            if (finalNum) {
                try {
                    let dm = await msg.member.createDM();
                    await dm.embed("You earned the `" + finalNum + " Golds` badge!");
                    await dm.send(new Discord.Attachment("./badges/gold" + finalNum + ".png", "gold.png"));
                } catch (e) {
                    await msg.channel.embed(msg.member.displayName + ", you earned the `" + finalNum + " Golds` badge, but I was unable to DM you.");
                }
            }
            (embed.embed) ? embed.embed.setFooter("x" + preGD.count + " | " + reaction.message.author.username + "'s total golds", "https://i.imgur.com/QTzrs2Y.png") : embed.setFooter("x" + preGD.count + " | " + reaction.message.author.username + "'s total golds", "https://i.imgur.com/QTzrs2Y.png");
            let m;
            if (embed.file) {
                m = await msg.guild.channels.get(chans.houseofgold).send(embed.embed);
                m = await msg.guild.channels.get(chans.houseofgold).send(embed.file);
            } else m = await msg.guild.channels.get(chans.houseofgold).send(embed);
            await m.react("%E2%AC%86"); await m.react("%E2%AC%87");
            try {
                let dm = await msg.member.createDM();
                let dm_embed = new Discord.RichEmbed().setColor("#FCE300");
                dm_embed.setAuthor("Given by " + msg.guild.members.get(user.id).displayName);
                dm_embed.setTitle("You got gold!");
                dm_embed.setDescription(msg.content);
                dm_embed.addField("Link:", `[Click Here](https://discordapp.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id})`);
                if (embed.file) {
                    dm_embed.attachFile(embed.file);
                    dm_embed.setImage(`attachment://${embed.file.name}`);
                }
                dm_embed.setFooter("Total golds: " + preGD.count, "https://i.imgur.com/QTzrs2Y.png");
                await dm.send(dm_embed);
            } catch (e) { console.log(e, /GOLDDMERR/); }
            await msg.member.addRole("386969744709910530");
        }
    });
});

//If a picture is pinned in #creations, send it to the #discord-creations channel for it to be LOVED
let doplease = true;
bot.on("channelPinsUpdate", (channel, time) => {
    if (channel.id === chans.creations && doplease) {
        channel.fetchPinnedMessages().then((data) => {
            let array = data.array();
            let wowzers = array[0];
            doplease = false;
            setTimeout(() => {
                doplease = true;
            }, 1000);
            wowzers.unpin();
            let picturesc = wowzers.attachments;
            let pictures = picturesc.array();
            let url = pictures[0].url;
            snekfetch.get(url).then((r) => {
                let embed = new Discord.RichEmbed({});
                embed.addField("\u200b", `[Post Link](https://discordapp.com/channels/269657133673349120/${wowzers.channel.id}/${wowzers.id})`);
                console.log(`https://discordapp.com/channels/269657133673349120/${wowzers.channel.id}/${wowzers.id}`);
                embed.setAuthor(wowzers.member.displayName, wowzers.author.avatarURL);
                embed.setImage(url);
                channel.guild.channels.get(chans.bestcreations).send({ embed: embed }).then((m) => {
                    m.react("💛");
                });
            });
        });
    }
});


var job = true;

//Handle these because sometime life throws you a curve ball
process.on("unhandledRejection", error => {
    console.log("unhandledRejection:::", error);
});

process.on("uncaughtException", function (err) {
    console.log((new Date).toUTCString() + " uncaughtException::", err.message);
    console.log(err.stack);
    if (bot.guilds.get("269657133673349120") && bot.guilds.get("269657133673349120").channels.get("470406597860917249")) bot.guilds.get("269657133673349120").channels.get("470406597860917249").send((err.message ? err.message : err.toString()));
});

//Why? I'm not sure if this does anything. I'm just scared to touch it.
var emojis = "🀄🃏🅰🅱🅾🅿🆎🆑🆒🆓🆔🆕🆖🆗🆘🆙🆚🇦🇨🇦🇩🇦🇪🇦🇫🇦🇬🇦🇮🇦🇱🇦🇲🇦🇴🇦🇶🇦🇷🇦🇸🇦🇹🇦🇺🇦🇼🇦🇽🇦🇿🇦🇧🇦🇧🇧🇧🇩🇧🇪🇧🇫🇧🇬🇧🇭🇧🇮🇧🇯🇧🇱🇧🇲🇧🇳🇧🇴🇧🇶🇧🇷🇧🇸🇧🇹🇧🇻🇧🇼🇧🇾🇧🇿🇧🇨🇦🇨🇨🇨🇩🇨🇫🇨🇬🇨🇭🇨🇮🇨🇰🇨🇱🇨🇲🇨🇳🇨🇴🇨🇵🇨🇷🇨🇺🇨🇻🇨🇼🇨🇽🇨🇾🇨🇿🇨🇩🇪🇩🇬🇩🇯🇩🇰🇩🇲🇩🇴🇩🇿🇩🇪🇦🇪🇨🇪🇪🇪🇬🇪🇭🇪🇷🇪🇸🇪🇹🇪🇺🇪🇫🇮🇫🇯🇫🇰🇫🇲🇫🇴🇫🇷🇫🇬🇦🇬🇧🇬🇩🇬🇪🇬🇫🇬🇬🇬🇭🇬🇮🇬🇱🇬🇲🇬🇳🇬🇵🇬🇶🇬🇷🇬🇸🇬🇹🇬🇺🇬🇼🇬🇾🇬🇭🇰🇭🇲🇭🇳🇭🇷🇭🇹🇭🇺🇭🇮🇨🇮🇩🇮🇪🇮🇱🇮🇲🇮🇳🇮🇴🇮🇶🇮🇷🇮🇸🇮🇹🇮🇯🇪🇯🇲🇯🇴🇯🇵🇯🇰🇪🇰🇬🇰🇭🇰🇮🇰🇲🇰🇳🇰🇵🇰🇷🇰🇼🇰🇾🇰🇿🇰🇱🇦🇱🇧🇱🇨🇱🇮🇱🇰🇱🇷🇱🇸🇱🇹🇱🇺🇱🇻🇱🇾🇱🇲🇦🇲🇨🇲🇩🇲🇪🇲🇫🇲🇬🇲🇭🇲🇰🇲🇱🇲🇲🇲🇳🇲🇴🇲🇵🇲🇶🇲🇷🇲🇸🇲🇹🇲🇺🇲🇻🇲🇼🇲🇽🇲🇾🇲🇿🇲🇳🇦🇳🇨🇳🇪🇳🇫🇳🇬🇳🇮🇳🇱🇳🇴🇳🇵🇳🇷🇳🇺🇳🇿🇳🇴🇲🇴🇵🇦🇵🇪🇵🇫🇵🇬🇵🇭🇵🇰🇵🇱🇵🇲🇵🇳🇵🇷🇵🇸🇵🇹🇵🇼🇵🇾🇵🇶🇦🇶🇷🇪🇷🇴🇷🇸🇷🇺🇷🇼🇷🇸🇦🇸🇧🇸🇨🇸🇩🇸🇪🇸🇬🇸🇭🇸🇮🇸🇯🇸🇰🇸🇱🇸🇲🇸🇳🇸🇴🇸🇷🇸🇸🇸🇹🇸🇻🇸🇽🇸🇾🇸🇿🇸🇹🇦🇹🇨🇹🇩🇹🇫🇹🇬🇹🇭🇹🇯🇹🇰🇹🇱🇹🇲🇹🇳🇹🇴🇹🇷🇹🇹🇹🇻🇹🇼🇹🇿🇹🇺🇦🇺🇬🇺🇲🇺🇳🇺🇸🇺🇾🇺🇿🇺🇻🇦🇻🇨🇻🇪🇻🇬🇻🇮🇻🇳🇻🇺🇻🇼🇫🇼🇸🇼🇽🇰🇽🇾🇪🇾🇹🇾🇿🇦🇿🇲🇿🇼🇿🈁🈂🈚🈯🈲🈳🈴🈵🈶🈷🈸🈹🈺🉐🉑🌀🌁🌂🌃🌄🌅🌆🌇🌈🌉🌊🌋🌌🌍🌎🌏🌐🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜🌝🌞🌟🌠🌡🌤🌥🌦🌧🌨🌩🌪🌫🌬🌭🌮🌯🌰🌱🌲🌳🌴🌵🌶🌷🌸🌹🌺🌻🌼🌽🌾🌿🍀🍁🍂🍃🍄🍅🍆🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍔🍕🍖🍗🍘🍙🍚🍛🍜🍝🍞🍟🍠🍡🍢🍣🍤🍥🍦🍧🍨🍩🍪🍫🍬🍭🍮🍯🍰🍱🍲🍳🍴🍵🍶🍷🍸🍹🍺🍻🍼🍽🍾🍿🎀🎁🎂🎃🎄🎅🏻🎅🏼🎅🏽🎅🏾🎅🏿🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🎖🎗🎙🎚🎛🎞🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏻🏂🏼🏂🏽🏂🏾🏂🏿🏂🏃🏻‍♀️🏃🏻‍♂️🏃🏻🏃🏼‍♀️🏃🏼‍♂️🏃🏼🏃🏽‍♀️🏃🏽‍♂️🏃🏽🏃🏾‍♀️🏃🏾‍♂️🏃🏾🏃🏿‍♀️🏃🏿‍♂️🏃🏿🏃‍♀️🏃‍♂️🏃🏄🏻‍♀️🏄🏻‍♂️🏄🏻🏄🏼‍♀️🏄🏼‍♂️🏄🏼🏄🏽‍♀️🏄🏽‍♂️🏄🏽🏄🏾‍♀️🏄🏾‍♂️🏄🏾🏄🏿‍♀️🏄🏿‍♂️🏄🏿🏄‍♀️🏄‍♂️🏄🏅🏆🏇🏻🏇🏼🏇🏽🏇🏾🏇🏿🏇🏈🏉🏊🏻‍♀️🏊🏻‍♂️🏊🏻🏊🏼‍♀️🏊🏼‍♂️🏊🏼🏊🏽‍♀️🏊🏽‍♂️🏊🏽🏊🏾‍♀️🏊🏾‍♂️🏊🏾🏊🏿‍♀️🏊🏿‍♂️🏊🏿🏊‍♀️🏊‍♂️🏊🏋🏻‍♀️🏋🏻‍♂️🏋🏻🏋🏼‍♀️🏋🏼‍♂️🏋🏼🏋🏽‍♀️🏋🏽‍♂️🏋🏽🏋🏾‍♀️🏋🏾‍♂️🏋🏾🏋🏿‍♀️🏋🏿‍♂️🏋🏿🏋️‍♀️🏋️‍♂️🏋🏌🏻‍♀️🏌🏻‍♂️🏌🏻🏌🏼‍♀️🏌🏼‍♂️🏌🏼🏌🏽‍♀️🏌🏽‍♂️🏌🏽🏌🏾‍♀️🏌🏾‍♂️🏌🏾🏌🏿‍♀️🏌🏿‍♂️🏌🏿🏌️‍♀️🏌️‍♂️🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏳️‍🌈🏳🏴‍☠️🏴🏵🏷🏸🏹🏺🏻🏼🏽🏾🏿🐀🐁🐂🐃🐄🐅🐆🐇🐈🐉🐊🐋🐌🐍🐎🐏🐐🐑🐒🐓🐔🐕🐖🐗🐘🐙🐚🐛🐜🐝🐞🐟🐠🐡🐢🐣🐤🐥🐦🐧🐨🐩🐪🐫🐬🐭🐮🐯🐰🐱🐲🐳🐴🐵🐶🐷🐸🐹🐺🐻🐼🐽🐾🐿👀👁‍🗨👁👂🏻👂🏼👂🏽👂🏾👂🏿👂👃🏻👃🏼👃🏽👃🏾👃🏿👃👄👅👆🏻👆🏼👆🏽👆🏾👆🏿👆👇🏻👇🏼👇🏽👇🏾👇🏿👇👈🏻👈🏼👈🏽👈🏾👈🏿👈👉🏻👉🏼👉🏽👉🏾👉🏿👉👊🏻👊🏼👊🏽👊🏾👊🏿👊👋🏻👋🏼👋🏽👋🏾👋🏿👋👌🏻👌🏼👌🏽👌🏾👌🏿👌👍🏻👍🏼👍🏽👍🏾👍🏿👍👎🏻👎🏼👎🏽👎🏾👎🏿👎👏🏻👏🏼👏🏽👏🏾👏🏿👏👐🏻👐🏼👐🏽👐🏾👐🏿👐👑👒👓👔👕👖👗👘👙👚👛👜👝👞👟👠👡👢👣👤👥👦🏻👦🏼👦🏽👦🏾👦🏿👦👧🏻👧🏼👧🏽👧🏾👧🏿👧👨🏻‍🌾👨🏻‍🍳👨🏻‍🎓👨🏻‍🎤👨🏻‍🎨👨🏻‍🏫👨🏻‍🏭👨🏻‍💻👨🏻‍💼👨🏻‍🔧👨🏻‍🔬👨🏻‍🚀👨🏻‍🚒👨🏻‍⚕️👨🏻‍⚖️👨🏻‍✈️👨🏻👨🏼‍🌾👨🏼‍🍳👨🏼‍🎓👨🏼‍🎤👨🏼‍🎨👨🏼‍🏫👨🏼‍🏭👨🏼‍💻👨🏼‍💼👨🏼‍🔧👨🏼‍🔬👨🏼‍🚀👨🏼‍🚒👨🏼‍⚕️👨🏼‍⚖️👨🏼‍✈️👨🏼👨🏽‍🌾👨🏽‍🍳👨🏽‍🎓👨🏽‍🎤👨🏽‍🎨👨🏽‍🏫👨🏽‍🏭👨🏽‍💻👨🏽‍💼👨🏽‍🔧👨🏽‍🔬👨🏽‍🚀👨🏽‍🚒👨🏽‍⚕️👨🏽‍⚖️👨🏽‍✈️👨🏽👨🏾‍🌾👨🏾‍🍳👨🏾‍🎓👨🏾‍🎤👨🏾‍🎨👨🏾‍🏫👨🏾‍🏭👨🏾‍💻👨🏾‍💼👨🏾‍🔧👨🏾‍🔬👨🏾‍🚀👨🏾‍🚒👨🏾‍⚕️👨🏾‍⚖️👨🏾‍✈️👨🏾👨🏿‍🌾👨🏿‍🍳👨🏿‍🎓👨🏿‍🎤👨🏿‍🎨👨🏿‍🏫👨🏿‍🏭👨🏿‍💻👨🏿‍💼👨🏿‍🔧👨🏿‍🔬👨🏿‍🚀👨🏿‍🚒👨🏿‍⚕️👨🏿‍⚖️👨🏿‍✈️👨🏿👨‍🌾👨‍🍳👨‍🎓👨‍🎤👨‍🎨👨‍🏫👨‍🏭👨‍👦‍👦👨‍👦👨‍👧‍👦👨‍👧‍👧👨‍👧👨‍👨‍👦‍👦👨‍👨‍👦👨‍👨‍👧‍👦👨‍👨‍👧‍👧👨‍👨‍👧👨‍👩‍👦‍👦👨‍👩‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👧👨‍👩‍👧👨‍💻👨‍💼👨‍🔧👨‍🔬👨‍🚀👨‍🚒👨‍⚕️👨‍⚖️👨‍✈️👨‍❤️‍👨👨‍❤️‍💋‍👨👨👩🏻‍🌾👩🏻‍🍳👩🏻‍🎓👩🏻‍🎤👩🏻‍🎨👩🏻‍🏫👩🏻‍🏭👩🏻‍💻👩🏻‍💼👩🏻‍🔧👩🏻‍🔬👩🏻‍🚀👩🏻‍🚒👩🏻‍⚕️👩🏻‍⚖️👩🏻‍✈️👩🏻👩🏼‍🌾👩🏼‍🍳👩🏼‍🎓👩🏼‍🎤👩🏼‍🎨👩🏼‍🏫👩🏼‍🏭👩🏼‍💻👩🏼‍💼👩🏼‍🔧👩🏼‍🔬👩🏼‍🚀👩🏼‍🚒👩🏼‍⚕️👩🏼‍⚖️👩🏼‍✈️👩🏼👩🏽‍🌾👩🏽‍🍳👩🏽‍🎓👩🏽‍🎤👩🏽‍🎨👩🏽‍🏫👩🏽‍🏭👩🏽‍💻👩🏽‍💼👩🏽‍🔧👩🏽‍🔬👩🏽‍🚀👩🏽‍🚒👩🏽‍⚕️👩🏽‍⚖️👩🏽‍✈️👩🏽👩🏾‍🌾👩🏾‍🍳👩🏾‍🎓👩🏾‍🎤👩🏾‍🎨👩🏾‍🏫👩🏾‍🏭👩🏾‍💻👩🏾‍💼👩🏾‍🔧👩🏾‍🔬👩🏾‍🚀👩🏾‍🚒👩🏾‍⚕️👩🏾‍⚖️👩🏾‍✈️👩🏾👩🏿‍🌾👩🏿‍🍳👩🏿‍🎓👩🏿‍🎤👩🏿‍🎨👩🏿‍🏫👩🏿‍🏭👩🏿‍💻👩🏿‍💼👩🏿‍🔧👩🏿‍🔬👩🏿‍🚀👩🏿‍🚒👩🏿‍⚕️👩🏿‍⚖️👩🏿‍✈️👩🏿👩‍🌾👩‍🍳👩‍🎓👩‍🎤👩‍🎨👩‍🏫👩‍🏭👩‍👦‍👦👩‍👦👩‍👧‍👦👩‍👧‍👧👩‍👧👩‍👩‍👦‍👦👩‍👩‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👧👩‍👩‍👧👩‍💻👩‍💼👩‍🔧👩‍🔬👩‍🚀👩‍🚒👩‍⚕️👩‍⚖️👩‍✈️👩‍❤️‍👨👩‍❤️‍👩👩‍❤️‍💋‍👨👩‍❤️‍💋‍👩👩👪🏻👪🏼👪🏽👪🏾👪🏿👪👫🏻👫🏼👫🏽👫🏾👫🏿👫👬🏻👬🏼👬🏽👬🏾👬🏿👬👭🏻👭🏼👭🏽👭🏾👭🏿👭👮🏻‍♀️👮🏻‍♂️👮🏻👮🏼‍♀️👮🏼‍♂️👮🏼👮🏽‍♀️👮🏽‍♂️👮🏽👮🏾‍♀️👮🏾‍♂️👮🏾👮🏿‍♀️👮🏿‍♂️👮🏿👮‍♀️👮‍♂️👮👯🏻‍♀️👯🏻‍♂️👯🏻👯🏼‍♀️👯🏼‍♂️👯🏼👯🏽‍♀️👯🏽‍♂️👯🏽👯🏾‍♀️👯🏾‍♂️👯🏾👯🏿‍♀️👯🏿‍♂️👯🏿👯‍♀️👯‍♂️👯👰🏻👰🏼👰🏽👰🏾👰🏿👰👱🏻‍♀️👱🏻‍♂️👱🏻👱🏼‍♀️👱🏼‍♂️👱🏼👱🏽‍♀️👱🏽‍♂️👱🏽👱🏾‍♀️👱🏾‍♂️👱🏾👱🏿‍♀️👱🏿‍♂️👱🏿👱‍♀️👱‍♂️👱👲🏻👲🏼👲🏽👲🏾👲🏿👲👳🏻‍♀️👳🏻‍♂️👳🏻👳🏼‍♀️👳🏼‍♂️👳🏼👳🏽‍♀️👳🏽‍♂️👳🏽👳🏾‍♀️👳🏾‍♂️👳🏾👳🏿‍♀️👳🏿‍♂️👳🏿👳‍♀️👳‍♂️👳👴🏻👴🏼👴🏽👴🏾👴🏿👴👵🏻👵🏼👵🏽👵🏾👵🏿👵👶🏻👶🏼👶🏽👶🏾👶🏿👶👷🏻‍♀️👷🏻‍♂️👷🏻👷🏼‍♀️👷🏼‍♂️👷🏼👷🏽‍♀️👷🏽‍♂️👷🏽👷🏾‍♀️👷🏾‍♂️👷🏾👷🏿‍♀️👷🏿‍♂️👷🏿👷‍♀️👷‍♂️👷👸🏻👸🏼👸🏽👸🏾👸🏿👸👹👺👻👼🏻👼🏼👼🏽👼🏾👼🏿👼👽👾👿💀💁🏻‍♀️💁🏻‍♂️💁🏻💁🏼‍♀️💁🏼‍♂️💁🏼💁🏽‍♀️💁🏽‍♂️💁🏽💁🏾‍♀️💁🏾‍♂️💁🏾💁🏿‍♀️💁🏿‍♂️💁🏿💁‍♀️💁‍♂️💁💂🏻‍♀️💂🏻‍♂️💂🏻💂🏼‍♀️💂🏼‍♂️💂🏼💂🏽‍♀️💂🏽‍♂️💂🏽💂🏾‍♀️💂🏾‍♂️💂🏾💂🏿‍♀️💂🏿‍♂️💂🏿💂‍♀️💂‍♂️💂💃🏻💃🏼💃🏽💃🏾💃🏿💃💄💅🏻💅🏼💅🏽💅🏾💅🏿💅💆🏻‍♀️💆🏻‍♂️💆🏻💆🏼‍♀️💆🏼‍♂️💆🏼💆🏽‍♀️💆🏽‍♂️💆🏽💆🏾‍♀️💆🏾‍♂️💆🏾💆🏿‍♀️💆🏿‍♂️💆🏿💆‍♀️💆‍♂️💆💇🏻‍♀️💇🏻‍♂️💇🏻💇🏼‍♀️💇🏼‍♂️💇🏼💇🏽‍♀️💇🏽‍♂️💇🏽💇🏾‍♀️💇🏾‍♂️💇🏾💇🏿‍♀️💇🏿‍♂️💇🏿💇‍♀️💇‍♂️💇💈💉💊💋💌💍💎💏💐💑💒💓💔💕💖💗💘💙💚💛💜💝💞💟💠💡💢💣💤💥💦💧💨💩💪🏻💪🏼💪🏽💪🏾💪🏿💪💫💬💭💮💯💰💱💲💳💴💵💶💷💸💹💺💻💼💽💾💿📀📁📂📃📄📅📆📇📈📉📊📋📌📍📎📏📐📑📒📓📔📕📖📗📘📙📚📛📜📝📞📟📠📡📢📣📤📥📦📧📨📩📪📫📬📭📮📯📰📱📲📳📴📵📶📷📸📹📺📻📼📽📿🔀🔁🔂🔃🔄🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🔙🔚🔛🔜🔝🔞🔟🔠🔡🔢🔣🔤🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🔴🔵🔶🔷🔸🔹🔺🔻🔼🔽🕉🕊🕋🕌🕍🕎🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧🕯🕰🕳🕴🏻🕴🏼🕴🏽🕴🏾🕴🏿🕴🕵🏻‍♀️🕵🏻‍♂️🕵🏻🕵🏼‍♀️🕵🏼‍♂️🕵🏼🕵🏽‍♀️🕵🏽‍♂️🕵🏽🕵🏾‍♀️🕵🏾‍♂️🕵🏾🕵🏿‍♀️🕵🏿‍♂️🕵🏿🕵️‍♀️🕵️‍♂️🕵🕶🕷🕸🕹🕺🏻🕺🏼🕺🏽🕺🏾🕺🏿🕺🖇🖊🖋🖌🖍🖐🏻🖐🏼🖐🏽🖐🏾🖐🏿🖐🖕🏻🖕🏼🖕🏽🖕🏾🖕🏿🖕🖖🏻🖖🏼🖖🏽🖖🏾🖖🏿🖖🖤🖥🖨🖱🖲🖼🗂🗃🗄🗑🗒🗓🗜🗝🗞🗡🗣🗨🗯🗳🗺🗻🗼🗽🗾🗿😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷😸😹😺😻😼😽😾😿🙀🙁🙂🙃🙄🙅🏻‍♀️🙅🏻‍♂️🙅🏻🙅🏼‍♀️🙅🏼‍♂️🙅🏼🙅🏽‍♀️🙅🏽‍♂️🙅🏽🙅🏾‍♀️🙅🏾‍♂️🙅🏾🙅🏿‍♀️🙅🏿‍♂️🙅🏿🙅‍♀️🙅‍♂️🙅🙆🏻‍♀️🙆🏻‍♂️🙆🏻🙆🏼‍♀️🙆🏼‍♂️🙆🏼🙆🏽‍♀️🙆🏽‍♂️🙆🏽🙆🏾‍♀️🙆🏾‍♂️🙆🏾🙆🏿‍♀️🙆🏿‍♂️🙆🏿🙆‍♀️🙆‍♂️🙆🙇🏻‍♀️🙇🏻‍♂️🙇🏻🙇🏼‍♀️🙇🏼‍♂️🙇🏼🙇🏽‍♀️🙇🏽‍♂️🙇🏽🙇🏾‍♀️🙇🏾‍♂️🙇🏾🙇🏿‍♀️🙇🏿‍♂️🙇🏿🙇‍♀️🙇‍♂️🙇🙈🙉🙊🙋🏻‍♀️🙋🏻‍♂️🙋🏻🙋🏼‍♀️🙋🏼‍♂️🙋🏼🙋🏽‍♀️🙋🏽‍♂️🙋🏽🙋🏾‍♀️🙋🏾‍♂️🙋🏾🙋🏿‍♀️🙋🏿‍♂️🙋🏿🙋‍♀️🙋‍♂️🙋🙌🏻🙌🏼🙌🏽🙌🏾🙌🏿🙌🙍🏻‍♀️🙍🏻‍♂️🙍🏻🙍🏼‍♀️🙍🏼‍♂️🙍🏼🙍🏽‍♀️🙍🏽‍♂️🙍🏽🙍🏾‍♀️🙍🏾‍♂️🙍🏾🙍🏿‍♀️🙍🏿‍♂️🙍🏿🙍‍♀️🙍‍♂️🙍🙎🏻‍♀️🙎🏻‍♂️🙎🏻🙎🏼‍♀️🙎🏼‍♂️🙎🏼🙎🏽‍♀️🙎🏽‍♂️🙎🏽🙎🏾‍♀️🙎🏾‍♂️🙎🏾🙎🏿‍♀️🙎🏿‍♂️🙎🏿🙎‍♀️🙎‍♂️🙎🙏🏻🙏🏼🙏🏽🙏🏾🙏🏿🙏🚀🚁🚂🚃🚄🚅🚆🚇🚈🚉🚊🚋🚌🚍🚎🚏🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🚚🚛🚜🚝🚞🚟🚠🚡🚢🚣🏻‍♀️🚣🏻‍♂️🚣🏻🚣🏼‍♀️🚣🏼‍♂️🚣🏼🚣🏽‍♀️🚣🏽‍♂️🚣🏽🚣🏾‍♀️🚣🏾‍♂️🚣🏾🚣🏿‍♀️🚣🏿‍♂️🚣🏿🚣‍♀️🚣‍♂️🚣🚤🚥🚦🚧🚨🚩🚪🚫🚬🚭🚮🚯🚰🚱🚲🚳🚴🏻‍♀️🚴🏻‍♂️🚴🏻🚴🏼‍♀️🚴🏼‍♂️🚴🏼🚴🏽‍♀️🚴🏽‍♂️🚴🏽🚴🏾‍♀️🚴🏾‍♂️🚴🏾🚴🏿‍♀️🚴🏿‍♂️🚴🏿🚴‍♀️🚴‍♂️🚴🚵🏻‍♀️🚵🏻‍♂️🚵🏻🚵🏼‍♀️🚵🏼‍♂️🚵🏼🚵🏽‍♀️🚵🏽‍♂️🚵🏽🚵🏾‍♀️🚵🏾‍♂️🚵🏾🚵🏿‍♀️🚵🏿‍♂️🚵🏿🚵‍♀️🚵‍♂️🚵🚶🏻‍♀️🚶🏻‍♂️🚶🏻🚶🏼‍♀️🚶🏼‍♂️🚶🏼🚶🏽‍♀️🚶🏽‍♂️🚶🏽🚶🏾‍♀️🚶🏾‍♂️🚶🏾🚶🏿‍♀️🚶🏿‍♂️🚶🏿🚶‍♀️🚶‍♂️🚶🚷🚸🚹🚺🚻🚼🚽🚾🚿🛀🏻🛀🏼🛀🏽🛀🏾🛀🏿🛀🛁🛂🛃🛄🛅🛋🛌🏻🛌🏼🛌🏽🛌🏾🛌🏿🛌🛍🛎🛏🛐🛑🛒🛠🛡🛢🛣🛤🛥🛩🛫🛬🛰🛳🛴🛵🛶🤐🤑🤒🤓🤔🤕🤖🤗🤘🏻🤘🏼🤘🏽🤘🏾🤘🏿🤘🤙🏻🤙🏼🤙🏽🤙🏾🤙🏿🤙🤚🏻🤚🏼🤚🏽🤚🏾🤚🏿🤚🤛🏻🤛🏼🤛🏽🤛🏾🤛🏿🤛🤜🏻🤜🏼🤜🏽🤜🏾🤜🏿🤜🤝🏻🤝🏼🤝🏽🤝🏾🤝🏿🤝🤞🏻🤞🏼🤞🏽🤞🏾🤞🏿🤞🤠🤡🤢🤣🤤🤥🤦🏻‍♀️🤦🏻‍♂️🤦🏻🤦🏼‍♀️🤦🏼‍♂️🤦🏼🤦🏽‍♀️🤦🏽‍♂️🤦🏽🤦🏾‍♀️🤦🏾‍♂️🤦🏾🤦🏿‍♀️🤦🏿‍♂️🤦🏿🤦‍♀️🤦‍♂️🤦🤧🤰🏻🤰🏼🤰🏽🤰🏾🤰🏿🤰🤳🏻🤳🏼🤳🏽🤳🏾🤳🏿🤳🤴🏻🤴🏼🤴🏽🤴🏾🤴🏿🤴🤵🏻🤵🏼🤵🏽🤵🏾🤵🏿🤵🤶🏻🤶🏼🤶🏽🤶🏾🤶🏿🤶🤷🏻‍♀️🤷🏻‍♂️🤷🏻🤷🏼‍♀️🤷🏼‍♂️🤷🏼🤷🏽‍♀️🤷🏽‍♂️🤷🏽🤷🏾‍♀️🤷🏾‍♂️🤷🏾🤷🏿‍♀️🤷🏿‍♂️🤷🏿🤷‍♀️🤷‍♂️🤷🤸🏻‍♀️🤸🏻‍♂️🤸🏻🤸🏼‍♀️🤸🏼‍♂️🤸🏼🤸🏽‍♀️🤸🏽‍♂️🤸🏽🤸🏾‍♀️🤸🏾‍♂️🤸🏾🤸🏿‍♀️🤸🏿‍♂️🤸🏿🤸‍♀️🤸‍♂️🤸🤹🏻‍♀️🤹🏻‍♂️🤹🏻🤹🏼‍♀️🤹🏼‍♂️🤹🏼🤹🏽‍♀️🤹🏽‍♂️🤹🏽🤹🏾‍♀️🤹🏾‍♂️🤹🏾🤹🏿‍♀️🤹🏿‍♂️🤹🏿🤹‍♀️🤹‍♂️🤹🤺🤼🏻‍♀️🤼🏻‍♂️🤼🏻🤼🏼‍♀️🤼🏼‍♂️🤼🏼🤼🏽‍♀️🤼🏽‍♂️🤼🏽🤼🏾‍♀️🤼🏾‍♂️🤼🏾🤼🏿‍♀️🤼🏿‍♂️🤼🏿🤼‍♀️🤼‍♂️🤼🤽🏻‍♀️🤽🏻‍♂️🤽🏻🤽🏼‍♀️🤽🏼‍♂️🤽🏼🤽🏽‍♀️🤽🏽‍♂️🤽🏽🤽🏾‍♀️🤽🏾‍♂️🤽🏾🤽🏿‍♀️🤽🏿‍♂️🤽🏿🤽‍♀️🤽‍♂️🤽🤾🏻‍♀️🤾🏻‍♂️🤾🏻🤾🏼‍♀️🤾🏼‍♂️🤾🏼🤾🏽‍♀️🤾🏽‍♂️🤾🏽🤾🏾‍♀️🤾🏾‍♂️🤾🏾🤾🏿‍♀️🤾🏿‍♂️🤾🏿🤾‍♀️🤾‍♂️🤾🥀🥁🥂🥃🥄🥅🥇🥈🥉🥊🥋🥐🥑🥒🥓🥔🥕🥖🥗🥘🥙🥚🥛🥜🥝🥞🦀🦁🦂🦃🦄🦅🦆🦇🦈🦉🦊🦋🦌🦍🦎🦏🦐🦑🧀‼⁉™ℹ↔↕↖↗↘↙↩↪#⃣⌚⌛⌨⏏⏩⏪⏫⏬⏭⏮⏯⏰⏱⏲⏳⏸⏹⏺Ⓜ▪▫▶◀◻◼◽◾☀☁☂☃☄☎☑☔☕☘☝🏻☝🏼☝🏽☝🏾☝🏿☝☠☢☣☦☪☮☯☸☹☺♀♂♈♉♊♋♌♍♎♏♐♑♒♓♠♣♥♦♨♻♿⚒⚓⚔⚕⚖⚗⚙⚛⚜⚠⚡⚪⚫⚰⚱⚽⚾⛄⛅⛈⛎⛏⛑⛓⛔⛩⛪⛰⛱⛲⛳⛴⛵⛷🏻⛷🏼⛷🏽⛷🏾⛷🏿⛷⛸⛹🏻‍♀️⛹🏻‍♂️⛹🏻⛹🏼‍♀️⛹🏼‍♂️⛹🏼⛹🏽‍♀️⛹🏽‍♂️⛹🏽⛹🏾‍♀️⛹🏾‍♂️⛹🏾⛹🏿‍♀️⛹🏿‍♂️⛹🏿⛹️‍♀️⛹️‍♂️⛹⛺⛽✂✅✈✉✊🏻✊🏼✊🏽✊🏾✊🏿✊✋🏻✋🏼✋🏽✋🏾✋🏿✋✌🏻✌🏼✌🏽✌🏾✌🏿✌✍🏻✍🏼✍🏽✍🏾✍🏿✍✏✒✔✖✝✡✨✳✴❄❇❌❎❓❔❕❗❣❤➕➖➗➡➰➿⤴⤵*⃣⬅⬆⬇⬛⬜⭐⭕0⃣〰〽1⃣2⃣㊗㊙3⃣4⃣5⃣6⃣7⃣8⃣9⃣©®";

function insideOf(string, array) {
    for (let i = 0; i < array.length; i++) {
        let evaluated = string.indexOf(array[i]);
        if (evaluated === -1) return false;
    }
    return true;
}

//Did you mean...? command suggestion
async function findClosestCommand(msg) {
    let noSpace = msg.content.replace(" ", "");
    if ((noSpace.charAt(0) === noSpace.charAt(1) && noSpace.charAt(1) === "!") || noSpace === "!") return;
    let someCommands = [];
    let args = msg.content.split(" ");
    let commandtoCheck = args[0].substring(1, args[0].length);
    args.shift();
    let restofcommand = args.join(" ");
    if (commandtoCheck.length > 150) return msg.channel.send("`Command not found!`");
    let sampleCommands = [];
    for (let command of commands) {
        sampleCommands.push(command.name);
        if (command.aliases) for (let a of command.aliases) sampleCommands.push(a);
    }

    //FUZZY MATCHING FIRST
    let matches = fuzzyMatch(sampleCommands, commandtoCheck);
    let foundMatch = null;
    if (matches.length > 1) {
        console.log(chalk.red("FUZZY MATCH"));
        foundMatch = matches[0];
    } else {
        console.log(chalk.red("LEVEN MATCH"));
        //LEVENSHTEIN DISTANCE
        let results = [];
        for (let string of sampleCommands) {
            results.push({ value: LevenshteinDistance(string, commandtoCheck), command: string });
        }

        let commandToUse = { value: 999999999999999, command: "NA" };
        for (let i in results) {
            if (results[i].value < commandToUse.value) commandToUse = results[i];
        }
        foundMatch = commandToUse.command;
    }

    let commandToEmbed = commands.find(c => {
        if (c.name === foundMatch) return true;
        else {
            if (!c.aliases) return false;
            else return c.aliases.some(a => a === foundMatch);
        }
    });

    if (commandToEmbed) {
        await msg.channel.send(new Discord.RichEmbed({ description: "Command not found! Suggested command:" }));
        await msg.channel.send(commandToEmbed.embed(msg));
    } else {
        await msg.channel.send(new Discord.RichEmbed({ description: "Command not found!" }));
    }

    //fucntions for ldistance
    function LevenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        var matrix = [];
        var i;
        for (i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        var j;
        for (j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (i = 1; i <= b.length; i++) {
            for (j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(matrix[i][j - 1] + 1, /*insertion*/matrix[i - 1][j] + 1)); // deletion
                }
            }
        }
        return matrix[b.length][a.length];
    };
}

//THREE STRIKES YOU'RE OUT!!!
// function handleStrike(msg, strikes) {
//     if (strikes < 0) return;
//     if (strikes > 3) strikes = 3;
//     msg.channel.embed(`Giving ${strikes == 0 ? "a warning" : ("strike number " + strikes)} to ${msg.member.displayName} for not contributing to the chat.`);
//     let descriptions = [
//         "You have received a warning for being off-topic or unproductive in #" + msg.channel.name + ". Because this is your first offense, this is simply a warning. **__Next time, you will receive a strike__**\n\n**1 strike**- 24 hour ban from the channel.\n**2 strikes**- 7 day ban from the channel.\n**3 strikes**- Permanent ban from the channel.",
//         "You have received a strike for being off-topic or unproductive in #" + msg.channel.name + ". You are banned from the channel for the next 24 hours.\n\nYou can regain access after 24 hours or check the time remaining by simply saying **!chanbans** in #commands.\n\n**The next offense will result in a 7 day ban from the channel.**",
//         "You have received a second strike for being off-topic or unproductive in #" + msg.channel.name + ". You are banned from the channel for the next 7 days.\n\nYou can regain access after 7 days or check the time remaining by simply saying **!chanbans** in #commands.\n\n**The next offense will result in a *permanent* ban from the channel**",
//         "You have received a third strike for being off-topic or unproductive in #" + msg.channel.name + ". **You are banned from the channel permanently.**"
//     ];
//     let times = [0, 1000 * 3600 * 24, 1000 * 3600 * 24 * 7, -10];
//     msg.member.createDM().then(async (dm) => {
//         dm.send({ embed: new Discord.RichEmbed({ description: descriptions[strikes] }).setColor("RANDOM") });
//         if (times[strikes] !== 0) {
//             msg.channel.overwritePermissions(msg.author, { SEND_MESSAGES: false }, "Channel ban started");
//             let strikeJSON = await fs.readFileAsync("strikes.json");
//             if (!strikeJSON[msg.author.id]) strikeJSON[msg.author.id] = {};
//             if (!strikeJSON[msg.author.id][msg.channel.id]) strikeJSON[msg.author.id][msg.channel.id] = { count: 1, time: 0 };
//             strikeJSON[msg.author.id][msg.channel.id].time = times[strikes] < 0 ? -10 : Date.now() + times[strikes];
//             fs.writeFileQueued("strikes.json", strikeJSON);
//         }
//     });
// }

let internetFailed = false;

setInterval(async () => {
    try {
        await snekfetch.get("https://www.google.com/");
        if (internetFailed) {
            pm2.restart("all");
            console.log(chalk.red.bold("RESTARTING ALL BOTS"));
            internetFailed = false;
        } else console.log(chalk.red("Successful internet connection"));
    } catch (e) {
        internetFailed = true;
        console.log(chalk.red.bold("INTERNET ERROR, WILL RESTART ALL BOTS UPON SUCCESSFUL CONNECTION."));
    }
}, 10000);

process.on("SIGINT", async function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C), waiting 5 seconds...");
    closingProcess = true;
    await bot.destroy();
    let count = 0;
    let interval = setInterval(() => {
        if (!fs || !fs.queue || fs.queue.length === 0 || count++ === 50) { //Wait for files to be written or wait 5 seconds
            clearInterval(interval);
            process.exit();
        }
    }, 100);
});
