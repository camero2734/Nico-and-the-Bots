//IMPORT
require("dotenv").config();
var pm2 = require("pm2");
pm2.connect((err) => {
    if (err) throw err;
    setTimeout(() => {
        pm2.restart("topfeed", () => { });
    }, 60 * 60 * 1000);
});

let snekfetch = require("snekfetch");
let fs = require("fs");
let archive = require("waybackarchive");
var ypi = require("youtube-channel-videos");
const Discord = require("discord.js");
const bot = new Discord.Client({ autoReconnect: true, max_message_cache: 0 });
const chalk = require("chalk");
const hasha = require("hasha");
const got = require("got");
const cheerio = require("cheerio");
const diff = require("fast-diff");
const checkforsite = require("./Functions/checkforsite.js");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
let chans = JSON.parse(fs.readFileSync("channels.json"));
let connection;
global.typeorm = require("typeorm");
fs.readdirSync("./app/model").forEach(file => {
    let fileName = file.split(".")[0];
    console.log(chalk.yellow.bold("LOADING MODEL " + fileName));
    global[fileName] = require("./app/model/" + file);
});

//PRELOAD
(async function() {
    let entities = [];
    let files = await fs.promises.readdir("./app/entity");
    files.forEach(async (file) => {
        let fileName = file.split(".")[0];
        console.log(chalk.red.bold("LOADING ENTITY " + fileName));
        entities.push(await require("./app/entity/" + file));
    });
    connection = await typeorm.createConnection({
        type: "sqlite",
        database: "discord.sqlite",
        synchronize: true,
        logging: false,
        entities: entities
    });
    await connection.manager.query("PRAGMA busy_timeout=10000;");
    console.log(chalk.bold("CONNECTION MADE"));
    bot.login(process.env.KEONS_TOKEN);
})();

let verbose = true;
let SocialMedia = require("node-social-media").setAuth({
    sessionid: process.env.SESSIONID,
    consumer: process.env.CONSUMER,
    consumer_secret: process.env.CONSUMER_S,
    access: process.env.ACCESS,
    access_secret: process.env.ACCESS_S
});


//OTHER SETUP
let topfeed;
let queue = [];
let processing = false;




let roles = {
    dmaorg: {
        id: "534890903664328714",
        channel: "534882770619465731",
        timer: null
    }
};

let timers = [null, null, null, null, null];


bot.on("ready", async () => {
    console.log("topfeed ready!");
    var guild = bot.guilds.get("269657133673349120");
    topfeed = guild.channels.get(chans.topfeed);
    await setUsers();
    console.log(chalk.green("USERS LOADED!"));
    controller().catch(e => {
        handleErr(e);
    });
    manageQueue();
    setTimer(1000 * 3600);
});
let state = 0;
let Users = [];

async function setTimer(time) {
    setTimeout(async () => {
        if (queue.length === 0) process.exit(0);
        else setTimer(1000 * 60);
    }, time);
}

async function manageQueue() {
    let locked = false;
    setInterval(async () => {
        if (queue.length > 0 && !locked) {
            locked = true;
            await sendFromQueue();
            locked = false;
        }
    }, 1000);
}

async function sendFromQueue() {
    if (queue.length > 0) {
        let first = queue.shift();
        let embeds = first[0];
        let source = first[1];
        if (!embeds || !source) return sendFromQueue();
        console.log("Sending embeds of length " + embeds.length);
        let channel = embeds.shift();
        if (source === "Snapchat") {
            await channel.send({
                embed: embeds[1],
                files: [embeds[2]]
            });
        } else {
            let pinged = null;
            for (let embed of embeds) {
                console.log(embed, /embedsend/);
                if (typeof embed === "string" && embed.startsWith("<@&") && embed.endsWith(">")) {
                    pinged = embed;
                    await enablePing(embed);
                }
                await channel.send(embed);
                await delay(1500);
            }
            if (pinged) await disablePing(pinged);
        }
        await delay(3000);
        return await sendFromQueue();
    } else return true;
}

let checkNum = 0;
let thousand = 0;
async function controller() {
    console.log(chalk.yellow("Check " + thousand + "#" + (++checkNum)));
    if (checkNum === 1000) checkNum = 0, thousand++;
    //TWITTER, SNAPCHAT, INSTAGRAM
    for (let i = 0; i < Users.length; i++) {
        let user = Users[i];
        if (user.details.timer < Date.now()) {
            user.details.count++;
            console.log(chalk.bold(user.details.name));
            user.details.timer = Date.now() + user.details.time;
            if (user.hasInstagram()) {
                let posts = await user.getInstagramPosts(3);
                let stories = await user.getInstagramStories();
                let profile = await user.getInstagramProfile();

                let avatar_response = await got(profile.avatar);
                let ava_img = avatar_response.body;
                let ava_hash = await hasha(ava_img);

                let links = [
                    { type: "avatar", link: ava_hash, hash: ava_hash, overrideLink: profile.avatar }
                ];
                for (let i = 0; i < posts.links.length; i++) {
                    links.push({ type: "Post", link: posts.links[i], data: posts.posts[i] });
                }
                for (let i = 0; i < stories.links.length; i++) {
                    links.push({ type: "Story", link: stories.stories[i].shortcode, data: stories.stories[i], overrideLink: stories.links[i] });
                }
                await checkLinks(links, "Instagram", user);
            }
            if (user.hasSnapchat()) {
                let posts = await user.getSnapchatStories();
                
                let links = [];
                for (let post of posts) {
                    links.push({ type: "Story", link: post });
                }
                await checkLinks(links, "Snapchat", user);
            }
            if (user.hasTwitter()) {
                let posts = await user.getTwitterPosts(3);
                let profile = await user.getTwitterProfile();
                
                let avatar_response = await got(profile.avatar);
                let ava_img = avatar_response.body;
                let ava_hash = await hasha(ava_img);

                
                let banner_response = profile.banner ? await got(profile.banner) : { body: "NOT_FOUND" };
                let ban_img = banner_response.body;
                let ban_hash = await hasha(ban_img);

                let links = [
                    { type: "avatar", link: profile.avatar, hash: ava_hash, data: profile },
                    { type: "banner", link: profile.banner, hash: ban_hash, data: profile }
                ];
                if (posts.links) {
                    for (let i = 0; i < posts.links.length; i++) {
                        links.push({ type: "Post", link: posts.links[i], data: posts[i] });
                    }
                }
                
                if (user.details.count % 4 === 0) {
                    console.log("checking likes");
                    let likes = await user.getTwitterLikes(3);
                    for (let i = 0; i < likes.links.length; i++) {
                        links.push({ type: "Like", link: likes.links[i], data: likes.data[i] });
                    }
                }
                
                await checkLinks(links, "Twitter", user);
            }
        }
    }
    //DMAORG, YOUTUBE
    if (checkNum % 3 === 0) {
        console.log(chalk.yellow("CHECKING DMAORG"));
        await wrapDmaorg();
        console.log(chalk.yellow("FINISHED DMAORG"));
    }

    if (checkNum % 5 === 0) {
        console.log(chalk.red("RUNNING IG COMMENTS PHP SCRIPT"));
        await wrapIGComments();
        console.log(chalk.red("IG COMMENTS CHECK DONE"));
    }

    if (checkNum % 10 === 0) {
        console.log(chalk.green("CHECKING GITHUB COMMITS"));
        await wrapGithub();
        console.log(chalk.green("FINISHED GITHUB COMMITS"));
    }

    if (checkNum % 20 === 0) {
        console.log(chalk.blue("CHECKING YOUTUBE"));
        await wrapYoutube();
        console.log(chalk.blue("FINISHED YOUTUBE"));
    }
    
    if (state !== 1) setTimeout(() => {
        controller().catch(err => {
            handleErr(err);
        });
    }, 5000);
}

async function enablePing(mention) {
    let guild = bot.guilds.get("269657133673349120");
    let id = mention.replace(/[^\d]+/g, "");
    let role = await guild.roles.get(id);
    await role.setMentionable(true);
    await delay(1000);
}

async function disablePing(mention) {
    await delay(1000);
    let guild = bot.guilds.get("269657133673349120");
    let id = mention.replace(/[^\d]+/g, "");
    let role = await guild.roles.get(id);
    await role.setMentionable(false);
}

async function wrapIGComments() {
    const STORY_TYPES = { LIKE: 60, COMMENT: 12, FOLLOWING: 101 };
    const USER_IDS = { tylerrjoseph: "22486465", joshuadun: "4607161", twentyonepilots: "21649484" };
    let idShortcode = function(id) {
        id = BigInt(id);
        let map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let base = BigInt(map.length);
        let code = "";
        while (id > 0) {
            let mod = id % base;
            id = (id - mod) / base;
            code = map[mod] + code;
        }
        return code;
    };

    try {
        if (fs.existsSync("./php/results.json")) { //DELETE JSON FIRST
            await fs.promises.unlink("./php/results.json");
        }
        //RUN PHP SCRIPT
        const { stdout, stderr } = await exec("cd php; php test.php");
        console.log(chalk.red(stdout));

        if (fs.existsSync("./php/results.json")) { //CHECK IF JSON EXISTS
            let json = JSON.parse(await fs.promises.readFile("./php/results.json"));
            if (!json || json.status !== "ok") throw new Error("JSON not ok");
            let stories = json.stories;
            for (let s of stories) {
                if (s.story_type === STORY_TYPES.LIKE) {
                    //disable for now
                } else if (s.story_type === STORY_TYPES.COMMENT) {
                    let text = s.args.text.split(":")[1].trim(); // X left a comment on Y's post: comment here
                    let info = s.args.media[0];
                    let postID = idShortcode(info.id.split("_")[0]);
                    if (Object.keys(USER_IDS).some(k => USER_IDS[k] === s.args.profile_id)) {
                        console.log(chalk.red("USERID EXISTS"));
                        let twitterName = Object.keys(USER_IDS).find(k => USER_IDS[k] === s.args.profile_id);
                        let url = `https://www.instagram.com/p/${postID}/?comment=${s.args.comment_id}`;
                        let comment_user = Users.find(u => { return u.twitterName ===  twitterName;});
                        if (!comment_user) throw new Error("Invalid user: " + twitterName);
                        let embed = new Discord.RichEmbed().setColor(comment_user.details.color);
                        embed.setAuthor(s.args.text.split(":")[0], s.args.profile_image);
                        embed.setDescription(text.substring(0, 2047));
                        embed.addField("Post Link", `[Click Here](${url})`);
                        let toPost = [{ link: url, toPost: [embed] }];
                        await checkLinks(toPost, "InstagramComment", comment_user);
                    }
                }
            }
        } else throw new Error("JSON not exist");
    } catch(e) {
        console.log(e);
        await bot.guilds.get("269657133673349120").channels.get(chans.bottest).send(e.message + " <@&554785502591451137>");
    }
}

async function setUsers() {
    Users = [
        new SocialMedia({ twitterName: "twentyonepilots" }, {
            name: "twenty one pilots",
            channel: "534882758770688031",
            role: "534890910526472202",
            color: "#fce300",
            time: 15 * 1000
        }),
        new SocialMedia({ twitterName: "tylerrjoseph" }, {
            name: "Tyler Joseph",
            channel: "470428804695851008",
            role: "534890883016032257",
            color: "#ff0000",
            time: 15 * 1000
        }),
        new SocialMedia({ twitterName: "joshuadun", snapName: "joshuadun" }, {
            name: "Josh Dun",
            channel: "534882732820529174",
            role: "534890899323224064",
            color: "#0005ff",
            time: 15 * 1000
        }),
        new SocialMedia({ twitterName: "debbyRyan" }, {
            name: "Debby Ryan",
            channel: "534882714566918174",
            role: "535588989713907713",
            color: "#FF0CE2",
            time: 45 * 1000
        }),
        // new SocialMedia({ instaName: "jennaajoseph" }, {
        //     name: "Jenna Joseph",
        //     channel: "534882714566918174",
        //     role: "534890933301542912",
        //     color: "#FFFAF0",
        //     time: 45 * 1000
        // }),
        // new SocialMedia({ instaName: "yungjimdun" }, {
        //     name: "Jim",
        //     channel: "534882714566918174",
        //     role: "534890931573358623",
        //     color: "#D4AD7F",
        //     time: 45 * 1000
        // }),
        new SocialMedia({ twitterName: "bradheaton" }, {
            name: "Brad Heaton",
            channel: "534882701963034624",
            role: "534890940343779328",
            color: "#d9593b",
            time: 60 * 1000
        }),
        new SocialMedia({ twitterName: "JordanCDun" }, {
            name: "Jordan Dun",
            channel: "534882701963034624",
            role: "534890940343779328",
            color: "#234400",
            time: 60 * 1000
        }),
        new SocialMedia({ twitterName: "ReelBearMedia" }, {
            name: "ReelBearMedia",
            channel: "534882701963034624",
            role: "534890940343779328",
            color: "#331900",
            time: 60 * 1000
        }),
        new SocialMedia({ twitterName: "JayDrummerBoy" }, {
            name: "Jay Joseph",
            channel: "534882701963034624",
            role: "534890940343779328",
            color: "#d3ffce",
            time: 60 * 1000
        }),
        new SocialMedia({ twitterName: "blurryface" }, {
            name: "BLURRYFACE",
            channel: "534882770619465731",
            role: "534890903664328714",
            color: "#ff0000",
            time: 45 * 1000
        })
    ];
    for (let user of Users) {
        user.details.timer = Date.now();
        user.details.count = 0;
        await user.load();
    }
}

async function delay(ms) {
    return new Promise(resolve => {
        setTimeout(() => {resolve();}, ms);
    });
}

async function checkLinks(links, platform, user) {
    for (let link of links) {
        //CHECK LOCAL LINKS FIRST
        let hasLink = await connection.getRepository(Topfeed).findOne({ type: platform, link: link.link });
        if (!hasLink) {
            //SAVE LINK
            console.log("WRITING " + link.link);
            let newTF = new Topfeed(platform, link.link, Date.now());
            await connection.manager.save(newTF);
            //SEND
            if (typeof link.overrideLink !== "undefined") link.link = link.overrideLink;
            let toPost = [];
            if (platform === "Instagram") {
                toPost = await wrapInstagram(link, user);
            } else if (platform === "Twitter") {
                if (link.overrideLink) console.log("Sending ", link);
                toPost = await wrapTwitter(link, user);
            } else if (platform === "Snapchat") {
                toPost = await wrapSnapchat(link, user);
            } else if (platform === "Youtube") {
                toPost = link.toPost;
            } else if (platform === "Github") {
                toPost = link.toPost;
            } else if (platform === "InstagramComment") {
                toPost = link.toPost;
            }
            if (toPost.length > 0) {
                if (link.type !== "Like" && link.type !== "avatar" && link.type !== "banner" && link.type !== "NoTag") toPost.unshift(`<@&${user.details.role}>`);
                toPost.unshift(bot.guilds.get("269657133673349120").channels.get(user.details.channel));
                queue.push([toPost, platform]);
            }
        }
    }
    return;
}

async function getChannelVideos(channelID) {
    return new Promise(resolve => {
        ypi.channelVideos(process.env.YOUTUBE, channelID, function (channelItems) {
            resolve(channelItems);
        });
    });
};

async function wrapGithub() {
    async function fetchCommentedPosts() {
        return new Promise(async resolve => {
            let r = await snekfetch.get("https://github.com/DJScias/Discord-Datamining/commits/master");
            let $ = cheerio.load(r.body.toString());
    
            let links = [];
            $(".muted-link.mt-2.mr-2.d-inline-block.v-align-middle").each((i, e) => {
                let link = "https://github.com" + e.attribs.href;
                links.push({ link: link, type: "NoTag", toPost: [`${link} <@&554785502591451137>`] });
            });

            resolve(links);
        });
    }

    let posts = await fetchCommentedPosts();
    let user = { details: { channel: "470406597860917249" } };
    await checkLinks(posts, "Github", user);
}

async function wrapYoutube() {
    return new Promise(async resolve => {
        let guild = bot.guilds.get("269657133673349120");  

        //TOP
        let top_links = [];
        let top = await getChannelVideos("UCBQZwaNPFfJ1gZ1fLZpAEGw");
        for (let video of top) {
            let yt_url = "https://www.youtube.com/watch?v=" + video.id.videoId;
            let link = { link: yt_url, toPost: [yt_url + " <@&538224831779307534>"] };
            top_links.push(link);
        }
        let top_user = Users.find(s => {return s.twitterName === "twentyonepilots";}) || Users[0];
        await checkLinks(top_links, "Youtube", top_user);

        //SLUSHIE GUYS
        let slush_links = [];
        let slushie = await getChannelVideos("UCITp_ri9o-MBpLLaYZalTTQ");
        for (let video of slushie) {
            let yt_url = "https://www.youtube.com/watch?v=" + video.id.videoId;
            let link = { link: yt_url, toPost: [yt_url] };
            slush_links.push(link);
        }
        let slushie_user = Users.find(s => {return s.twitterName === "tylerrjoseph";}) || Users[1];
        await checkLinks(slush_links, "Youtube", slushie_user);
        
        resolve(true);
    });
}

async function wrapDmaorg() {
    return new Promise(async resolve => {
        let guild = bot.guilds.get("269657133673349120");
        let changedSites = [];
        
        let sites = [
            { name: "dmaorg", url: "http://dmaorg.info/found/15398642_14/clancy.html", tag: true },
            { name: "dmaroot", url: "http://dmaorg.info", tag: true },
            { name: "nicoandtheniners", url: "http://nicoandtheniners.com/", tag: false },
            { name: "nicoJSON", url: "http://nicoandtheniners.com/release/pull", tag: false },
            { name: "dmaorgIndex", url: "http://plu.evx.mybluehost.me/", tag: false }
        ];

        for (let site of sites) {
            guild.chans = chans;
            let change = await checkforsite(site.url, site.name, site.tag, guild);
            if (change) {
                await guild.channels.get(chans.bottest).send("<@221465443297263618> sending change in " + site.name + " at " + Date.now());
                let c = [];
                if (site.tag) {
                    let embed = new Discord.RichEmbed().setTitle(change.type + " CHANGE IN " + site.name.toUpperCase()).setColor("#69A570");
                    if (change.data.indexOf("://")) embed.setImage(change.data);
                    c.unshift(embed);
                    if (change.type.toUpperCase() === "MAJOR") c.unshift("<@&534890903664328714>"); //ONLY TAG IF MAJOR
                } else {
                    let embed = new Discord.RichEmbed().setTitle("MINOR CHANGE IN " + site.name.toUpperCase()).setColor("#69A570");
                    c.unshift(embed);
                }
                c.unshift(guild.channels.get("534882770619465731"));
                queue.push([c, "dmaorg"]);
            }
        }
        //console.log(changedSites, /CHANGED/);
        resolve(true);
    });
}


async function wrapTwitter(post, user) {
    let embed = new Discord.RichEmbed().setColor(user.details.color);
    if (post.type === "avatar" || post.type === "banner") {
        embed.setAuthor(`${user.details.name} updated their ${post.type}!`);
        embed.setImage(post.link);
        embed.setFooter(post.hash, "https://images-ext-1.discordapp.net/external/p0hmzxdYkwJE0RZeFN7Bi8TxlAX1DelMCWY2AaJ536c/https/pbs.twimg.com/profile_images/1013798240683266048/zRim1x6M.jpg");
        return [embed];
    } else {
        let message = `Twitter ${post.type} from ${user.details.name}`;
        embed.setAuthor(message);
        embed.setThumbnail(post.data.user.profile_image_url);
        embed.setFooter(post.data.created_at, "https://images-ext-1.discordapp.net/external/p0hmzxdYkwJE0RZeFN7Bi8TxlAX1DelMCWY2AaJ536c/https/pbs.twimg.com/profile_images/1013798240683266048/zRim1x6M.jpg");
        embed.setDescription(post.data.full_text);
        embed.addField("\u200b", `[Post Link](https://twitter.com/${post.data.user.screen_name}/status/${post.data.id_str})`);
        if (post.data.entities && post.data.entities.media && post.data.entities.media[0]) embed.setImage(post.data.entities.media[0].media_url);
        return [embed];
    }
    
}

async function wrapSnapchat(post, user) {
    post = post.link;
    let embed = new Discord.RichEmbed().setColor(user.details.color);
    embed.setTitle("Snapchat from " + user.details.name);
    
    //GET BITMOJI
    let s = await user.getSnapcode();
    let $ = cheerio.load(s.svg);
    let image = $("image")[0];
    let img;
    if (!image) img = s.png;
    else if (image && image.attribs && image.attribs.href) {
        img = new Buffer.from(image.attribs.href.match(/^data:.+\/(.+);base64,(.*)$/)[2], "base64");
    }

    if (img) embed.attachFile(new Discord.Attachment(img, "icon.png"));
    embed.setThumbnail("attachment://icon.png");

    let buffer = await snekfetch.get(post);
    let parts = post.split(".");
    let ending = parts[parts.length - 1];
    let att = new Discord.Attachment(buffer.body, `snapchat.${ending.substring(0, 3)}`);
    return [embed, att];
}

async function wrapInstagram(post, user) {
    return new Promise(async resolve => {
        if (post.type === "avatar" || post.type === "banner") {
            let embed = new Discord.RichEmbed().setColor(user.details.color);
            embed.setAuthor(user.details.name + " changed profile picture!");
            embed.setImage(post.link);
            embed.setFooter(post.hash);
            resolve([embed]);
        } else {
            let embed = new Discord.RichEmbed().setColor(user.details.color);
            let profile = await user.getInstagramProfile();
            if (!profile) resolve([]);
            else {
                embed.setThumbnail(profile.avatar);
                embed.setDescription(post.data.caption ? post.data.caption : "No caption");
                embed.setAuthor(post.type + " from " + user.details.name + ` (${user.instaName})`);
                embed.setFooter(new Date(1000 * post.data.taken_at_timestamp), "https://images-ext-2.discordapp.net/external/jncL2CC80EDZyhl_3Jj72zIyEtxG_ypQWQtXBximES8/https/instagram-brand.com/wp-content/uploads/2016/11/app-icon2.png");
                let urls = [];
                urls = post && post.data && post.data.getPostMedia ? await post.data.getPostMedia() : urls;
                if (post.type === "Story") urls = [post.link];
                for (let i = 0; i < urls.length; i++) {
                    let parts = urls[i].split("?");
                    urls[i] = parts[0] + "?" + parts[1];
                }
                if (urls.length <= 1 && !urls.some(l => {return l.includes(".mp4");})) {
                    if (urls.length === 1) embed.setImage(urls[0]);
                    embed.addField("Post Link: ", `[Click Here](${post.link})`);
                    resolve([embed]);
                } else {
                    embed.addField("\u200b", `[Post Link](${post.link})`);
                    let embeds = [];
                    embeds.push(embed);
                    for (let i = 0; i < urls.length; i++) {
                        let pembed = new Discord.RichEmbed().setColor(user.details.color);
                        pembed.setTitle(`${i + 1}/${urls.length}`);
                        if (urls[i].includes(".mp4")) {
                            embeds.push(pembed);
                            let buffer = await snekfetch.get(urls[i]);
                            let att = new Discord.Attachment(buffer.body, "instagram.mp4");
                            embeds.push(att);
                        } else {
                            pembed.setImage(urls[i]);
                            embeds.push(pembed);
                        }
                    }
                    resolve(embeds);
                }
            }
        }
        resolve([]);
    });
}

Discord.Role.prototype.allowMentionTime = async function(seconds) {
    await this.setMentionable(true, "topfeed ping");
    let roleShort;
    for (let key in roles) if (roles[key].id === this.id) roleShort = key;
    if (roles[roleShort]) {
        if (roles[roleShort].timer !== null) clearTimeout(roles[roleShort].timer);
        let role = this.id;
        let myTimeout = setTimeout(() => {
            console.log(chalk.green("role turning off..."));
            bot.guilds.get("269657133673349120").roles.get(role).setMentionable(false, "topfeed off");
        }, seconds * 1000);
        roles[roleShort].timer = myTimeout;
    }
    return true;
};

bot.on("message", msg => {
    if (msg.content === "..ping") return msg.channel.send("t*pfeed is on!");
});

//Error handling
bot.on("error", e => handleErr(e));
process.on("uncaughtException", e => handleErr(e));
process.on("unhandledRejection", e => handleErr(e));

function handleErr(e) {
    try {
        if (!e.message || e.message.indexOf("503") === -1) bot.guilds.get("269657133673349120").channels.get("470406597860917249").send(e.message ? e.message : e.toString(), { split: true });
    } catch(e) {
        console.log(e, /TRYCATCHAHNDLEERR/);
    }
    console.log(e, /E-1/);
    setTimeout(() => {process.exit(0);}, 10000);
}




/*
async function checkforsite(url, checkname, tag) {
            return new Promise(async res => {
                snekfetch.get(url).then(async (r) => {
                    //MOON COUNT
                    r.moon = (r.text.match(/MOON/gi)) && (r.text.match(/MOON/gi)).length;
                    //SAVE ORIGINAL UNMODIFIED URL
                    r.originalURL = url;
                    //WHAT
                    if (checkname === 'dmaorg') (r.text.match(/MOON/gi)).length;
                    //If the file doesn't exist, then it obviously "changed"
                    if (!fs.existsSync('./dmasite/' + checkname + '.txt')) await changed(r, checkname, false), res();
                    //Check stored version of site, get moon count as well
                    let stored = fs.readFileSync('./dmasite/' + checkname + '.txt', 'utf8')
                    r.oldmoon = (stored.match(/MOON/gi)) && (stored.match(/MOON/gi)).length;

                    //Is the new html different from the old?
                    if (textIsValid(r.text, checkname) && r.text !== stored) {
                        r.stored = stored;
                        console.log(r.oldmoon, r.moon);
                        //"Major" if dmaorg and the moon count changed
                        r.major = (checkname === 'dmaorg') && r.oldmoon !== r.moon;
                        await changed(r, checkname, tag);
                    } //Otherwise it's the same
                    else await same()
                    res();
                }).catch(async err => {
                    //Gotta get those 403 pages too
                    await ignoreError(err, checkname, tag);
                    res();
                })
            })
            
        }
    
        function textIsValid(text, checkname) {
            console.log(checkname, /CHECKING TEXT/);

            let phrases = ["temporarily unavailable", "internalerror", "fatal error:", "cgi-bin", "508 resource limit", "internal server", "503 service", "website unavailable", "please try again later"];

            //If the text is undefined, that's not an update
            if (!text || typeof text !== 'string' || text === "") {
                try { guild.channels.get(chans.bottest).send(text + " <@221465443297263618> not sent, [undefined]", {split: true}) } catch(e) {console.log(e)};
                return false;
            }

            for (let phrase of phrases) {
                if (text.toLowerCase().indexOf(phrase.toLowerCase()) !== -1) {
                    try { guild.channels.get(chans.bottest).send(text + " <@221465443297263618> not sent, [" + phrase + "]", {split: true}) } catch(e) {console.log(e)};
                    console.log(phrase + " made undefined")
                    return false;
                }
            }

            //try { guild.channels.get(chans.bottest).send(text + " <@221465443297263618>", {split: true}) } catch(e) {console.log(e)};
            console.log(text, /VALID/)
            return text.length > 30;
        }
    
    
        async function ignoreError(r, checkname, tag) {
            //Same check as for non 403 pages
            if (!(await fs.existsSync('./dmasite/' + checkname + '.txt'))) return await changed(r, checkname, false);
            r.stored = await fs.readFileSync('./dmasite/' + checkname + '.txt', 'utf8');
            if (r.text !== r.stored) await changed(r, checkname, tag);
            else await same();
        }
    
        async function changed(r, checkname, tag) {
            //What a glorious day
            console.log(new RegExp(checkname.toUpperCase() + " UPDATED"));
            await new Promise(async resolveChanged => {
                //Safely try to tag myself
                //try {await guild.channels.get("470406597860917249").send("<@221465443297263618> dma site updated");} catch(e) {console.log(e)}
                
                //New file name
                let fileName = './dmasite/html/' + checkname + Date.now() + '.html'
                //Write the txt file (the one that's compared to)
                fs.writeFile('./dmasite/' + checkname + '.txt', r.text, 'utf8', (err) => {
                    if (err) console.log(err)
                })
                //Write html file (for archiving purposes)
                fs.writeFile(fileName, r.text, 'utf8', (err) => {
                    console.log(r.originalURL)
                    archive(r.originalURL, { attempts: 10 }).then((a_url) => {
                        if (checkname === 'dmaorg') guild.channels.get(chans.resourcesupdates).send('Archived current page: ' + a_url + ' \n\nAlso sending the HTML file as backup: ', { file: fileName })
                    }).catch(err => {
                        if (checkname === 'dmaorg') guild.channels.get(chans.resourcesupdates).send('**Unable to archive, fell back to the HTML file for changed dmaorg site. Download and open in browser.**\n*note that images will not be displayed due to how they are linked, this HTML file serves mostly as verification that something changed*', { file: fileName })
                    })
                })

                //CREATE EMBED
                let embed = new Discord.RichEmbed({ title: `${r.major ? "Major" : "Minor"} change in ${checkname} detected!` })
                //Get differences
                if (typeof r.text === "undefined" || r.text.toLowerCase().indexOf("undefined") !== -1) return guild.channels.get(chans.bottest).send("Undefined glitch dmaorg " + checkname);
                let result = diff(r.stored ? r.stored : "", r.text ? r.text : "");
                console.log(result, /DIFF/)
                let types = ["+", "=", "-"]
                let string = "```diff\n"

                //Add diffs
                for (let i = 0; i < result.length; i++) {
                    if (result[i][0] !== 0) {
                        console.log(result[i])
                        let _txt = result[i][1];
                        string+="\n" + types[result[i][0]+1] + " " + _txt.replace(/\n/g, "").substring(0, 100);
                    }
                }
                embed.setDescription(string+"```");

                if (checkname === "dmaorg" && tag) { //GET NEW IMAGE IF MAJOR DMAORG UPDATE
                    let $ = cheerio.load(r.body);
                    $("img").each((i, elem) => {
                        if (r.stored.indexOf(elem.attribs.src) === -1) embed.setImage("http://dmaorg.info/found/15398642_14/" + elem.attribs.src);
                    })
                }

                //Add to changeSites array
                changedSites.push([embed, tag]);
                resolveChanged();
            })
    
        }

*/