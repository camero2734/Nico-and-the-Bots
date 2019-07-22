const fs = module.require("fs");
const cheerio = require("cheerio");
const snekfetch = require("snekfetch");
const got = require('got')
require('dotenv').config()
const Discord = require("discord.js");
const checkDE = require('./Functions/deRequirements.js')
var seatgeek = require("seatgeek");
var sql = module.require("sqlite");
var ontime = require("ontime")
let chans;
sql.open('./daily.sqlite', { cached: true });
const bot = new Discord.Client({ autoReconnect: true, max_message_cache: 0 });
bot.login(process.env.KEONS_TOKEN);
const loadJsonFile = require('load-json-file');
const writeJsonFile = require('write-json-file');

var Twit = require('twit');

var T_POST = new Twit({
    consumer_key:         process.env.CONSUMER,
    consumer_secret:      process.env.CONSUMER_S,
    access_token:         process.env.ACCESS,
    access_token_secret:  process.env.ACCESS_S,
    timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})


bot.on('ready', () => {
    loadJsonFile('channels.json').then(async (c) => {
        await sql.run("PRAGMA busy_timeout=6000");
        chans = c
        let guild = bot.guilds.get('269657133673349120')
        reddit();
        setInterval(() => {reddit()}, 10 * 60 * 1000)
        setShops(guild)
        //websiteDay(); updateDay();
        console.log('I wish I had two faces!')
        //reddit
        
    })
})



bot.on('message', msg => {
    if (msg.content === '@@ping') {
        msg.channel.send('Reddit and Twitter feeds running!')
    }
})

function reddit() {
    let url = "https://www.reddit.com/r/twentyonepilots/new.json";
    got(url, {headers: {'user-agent': `twenty one pilots discord bot`}}).then((r) => {
        let json = JSON.parse(r.body).data.children;
        for (let i = json.length - 1; i >= 0; i--) {
            post = json[i].data;
            let embed = new Discord.RichEmbed().setAuthor(post.author, "https://www.androidpolice.com/wp-content/uploads/2016/01/nexus2cee_reddit.png", "https://www.reddit.com" + post.permalink).setTitle(post.title.substring(0,255)).setDescription(post.selftext.substring(0,2000));
            function isImage(url) {return (url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".mp4"))}
            if (post.url !== "https://www.reddit.com" + post.permalink) {
                if (isImage(post.url)) {
                    embed.setImage(post.url)
                } else {
                    embed.addField("Attached Link", post.url)
                }
            }
            checkLink("https://www.reddit.com" + post.permalink, "reddit", bot.guilds.get('269657133673349120').channels.get(chans.redditfeed), embed)
        }
    }).catch(e => {
        console.log(e);
    })
}

async function setShops(guild) {
    if (!guild) guild = bot.guilds.get("269657133673349120");
    let shop = guild.channels.get(chans.shop);
    shop.bulkDelete(20);
    let embed = new Discord.RichEmbed();
    embed.setTitle('Role Shop');
    embed.addField('🇦 | Common Fren', '100 D');
    embed.addField('🇧 | Heavydirtysoul', '6,000 C | 21 L');
    embed.addField('🇨 | Trees', '6,000 C | 21 L');
    embed.addField('🇩 | Anathema', '6,000 C | 21 L');
    embed.addField('🇪 | Holding on to You', '6,000 C | 21 L');
    embed.addField('🇫 | Kitchen Sink', '6,000 C | 21 L');
    embed.addField('🇬 | Isle of Flightless Birds', '6,000 C | 21 L');
    embed.addField('🇭 | Clear', '6,000 C | 21 L');
    embed.addField('💵 | Rich', '50,000 C');
    embed.addField('💿 | DΣMΛ', '100,000 C');
    embed.setFooter('C = Credits | L = Level | D = # of !daily uses');
    shop.send({embed:embed}).then(async (m) => {
        await m.react('🇦');
        await m.react('🇧');
        await m.react('🇨');
        await m.react('🇩');
        await m.react('🇪');
        await m.react('🇫');
        await m.react('🇬');
        await m.react('🇭');
        await m.react('💵');
        await m.react('💿');
        await sendSongRoleShop()
    })
    async function sendLTShop() {
        let embed2 = new Discord.RichEmbed();
        embed2.setTitle('Level Token (LT) Shop')
        embed2.addField('🇦 | Hometown', '2 LT')
        embed2.addField('🇧 | Lovely', '2 LT')
        embed2.addField('🇨 | Lane Boy', '2 LT')
        embed2.addField('🇩 | Ode to Sleep', '2 LT')
        embed2.addField('🇪 | Fall Away', '2 LT')
        embed2.addField('🇫 | Goner', '2 LT')
        embed2.addField('🇬 | Forest', '2 LT')
        embed2.addField('🇭 | Nico and the Niners', '3 LT')
        embed2.addField('🇮 | Jumpsuit', '3 LT')
        embed2.addField('🇯 | Levitate', '3 LT')
        embed2.addBlankField()
        embed2.addField('❤ | 2x Daily', '6 LT')
        embed2.addField('💙 | Blurrybox Token Increaser', '5 LT')
        embed2.addField('💛 | Random Song Role', '1 LT | 10,000 C')
        embed2.addField('💚 | Earn credits on level up', '4 LT')
        embed2.setFooter('LT = Level Tokens [Earn by leveling up] | C = Credits')
        let m = await shop.send({embed:embed2});
        await m.react('🇦')
        await m.react('🇧')
        await m.react('🇨')
        await m.react('🇩')
        await m.react('🇪')
        await m.react('🇫')
        await m.react('🇬')
        await m.react('🇭')
        await m.react('🇮')
        await m.react('🇯')
        await m.react('❤')
        await m.react('💙')
        await m.react('💛')
        await m.react('💚')
        await sendLevelShop();
    }

    async function sendLevelShop() {
        let levelembed = new Discord.RichEmbed();
        levelembed.setTitle('Level Badge Shop');
        levelembed.addField('🔵 | Level 25', '25L');
        levelembed.addField('🔴 | Level 50', '50L');
        levelembed.addField('⚫ | Level 100', '100L');
        levelembed.setFooter('L = Level | Appears on !score as a badge');
        let m = await shop.send({embed: levelembed});
        await m.react('🔵');
        await m.react('🔴');
        await m.react('⚫');
        await sendColorShop();
    }

    async function sendSongRoleShop() {
        let embed3 = new Discord.RichEmbed();
        embed3.setTitle('Song Role Shop')
        embed3.addField('🇦 | Car Radio', '6,000 C | 21 L');
        embed3.addField('🇧 | Chlorine', '6,000 C | 21 L');
        embed3.addField('🇨 | Cut My Lip', '6,000 C | 21 L');
        embed3.addField('🇩 | Fairly Local', '6,000 C | 21 L');
        embed3.addField('🇪 | Migraine', '6,000 C | 21 L');
        embed3.addField('🇫 | Morph', '6,000 C | 21 L');
        embed3.addField('🇬 | Pet Cheetah', '6,000 C | 21 L');
        embed3.addField('🇭 | Ruby', '6,000 C | 21 L');
        embed3.addField('🇮 | Taxi Cab', '6,000 C | 21 L');
        embed3.setFooter('C = Credits, L = Level');
        let m = await shop.send({embed:embed3});
        await m.react('🇦');
        await m.react('🇧');
        await m.react('🇨');
        await m.react('🇩');
        await m.react('🇪');
        await m.react('🇫');
        await m.react('🇬');
        await m.react('🇭');
        await m.react('🇮');
        await sendLTShop();
    }

    async function sendColorShop() {
        console.log("SEND COLOR SHOP");
        //TIER 1
        let tier1 = new Discord.RichEmbed().setColor("RANDOM");
        tier1.setTitle("Tier 1 Color Shop");
        tier1.addField("1⃣ | Cheetah Tan (#AB9D85)", "10 L | 7,500 C");
        tier1.addField("2⃣ | Vulture Brown (#7e7064)", "10 L | 7,500 C");
        tier1.addField("3⃣ | Bandito Green (#74774A)", "10 L | 7,500 C");
        tier1.setFooter("Preview colors using !colorroles || L = Level, C = Credits");
        let m1 = await shop.send(tier1);
        await m1.react('1⃣');
        await m1.react('2⃣');
        await m1.react('3⃣');

        //TIER 2
        let tier2 = new Discord.RichEmbed().setColor("RANDOM");
        tier2.setTitle("Tier 2 Color Shop");
        tier2.addField("1⃣ | No Pink Intended (#b18f95)", "20 L | 15,000 C");
        tier2.addField("2⃣ | Regional at Blue (#aebfd8)", "20 L | 15,000 C");
        tier2.addField("3⃣ | Dema Gray (#9B9BAD)", "20 L | 15,000 C");
        tier2.addField("4⃣ | Jumpsuit Green  (#40BF80)", "20 L | 15,000 C");
        tier2.setFooter("Preview colors using !colorroles || L = Level, C = Credits");
        let m2 = await shop.send(tier2);
        await m2.react('1⃣');
        await m2.react('2⃣');
        await m2.react('3⃣');
        await m2.react('4⃣');

        //TIER 3
        let tier3 = new Discord.RichEmbed().setColor("RANDOM");
        tier3.setTitle("Tier 3 Color Shop");

        tier3.addField("1⃣ | Ned Blue (#C6E2FF)", "50 L | 25,000 C");
        tier3.addField("2⃣ | March to the Cyan (#60ffee)", "50 L | 25,000 C");
        tier3.addField("3⃣ | Holding on to Blue (#4a83e6)", "50 L | 25,000 C");
        tier3.addField("4⃣ | Forest Green (#11806a)", "50 L | 25,000 C");
        tier3.addField("5⃣ | Trees Green (#a9ff9f)", "50 L | 25,000 C");
        tier3.addField("6⃣ | Kitchen Pink (#FF9DAE)", "50 L | 25,000 C");
        tier3.addField("7⃣ | Chlorine Pink (#ff7d9a)", "50 L | 25,000 C");
        tier3.addField("8⃣ | Pink You Out (#FF1493)", "50 L | 25,000 C");
        tier3.addField("9⃣ | The Red and Go (#EA3A3F)", "50 L | 25,000 C");
        tier3.addField("0⃣ | Rebel Red (#FF0000)", "50 L | 25,000 C");
        tier3.addField("🇦| Torch Orange (#FF8C00)", "50 L | 25,000 C");
        tier3.addField("🇧| Fairly Lilac (#ccacea)", "50 L | 25,000 C");
        tier3.addField("🇨| Pantaloon Purple (#8f81ff)", "50 L | 25,000 C");
        tier3.addField("🇩| Pet Cheetah Purple (#7113bd)", "50 L | 25,000 C");
        tier3.setFooter("Preview colors using !colorroles || L = Level, C = Credits");
        let m3 = await shop.send(tier3);
        await m3.react('1⃣');
        await m3.react('2⃣');
        await m3.react('3⃣');
        await m3.react('4⃣');
        await m3.react('5⃣');
        await m3.react('6⃣');
        await m3.react('7⃣');
        await m3.react('8⃣');
        await m3.react('9⃣');
        await m3.react('0⃣');
        await m3.react('🇦');
        await m3.react('🇧');
        await m3.react('🇨');
        await m3.react('🇩');
        //TIER 4
        let tier4 = new Discord.RichEmbed().setColor("RANDOM");
        tier4.setTitle("Tier 4 Color Shop");
        tier4.addField("1️⃣ | Clancy Black (#000001)", "100 L | 50,000 C");
        tier4.addField("2️⃣ | DMAORG White (#FFFFFE)", "100 L | 50,000 C");
        tier4.setFooter("Preview colors using !colorroles || L = Level, C = Credits");
        let m4 = await shop.send(tier4);
        await m4.react('1⃣');
        await m4.react('2⃣');
    }

}


bot.on('messageReactionAdd', (reaction, user) => {
    if (user.bot && user.id !== "470410168186699788") return;
    if (reaction.message.channel.id !== chans.shop) return;
    if (reaction.message.embeds[0].title === 'Role Shop') {
        if (reaction.emoji.name === '🇦') {
            buyRole('332021614256455690', 0, 0, 100, user.id, reaction, true)
        }
        if (reaction.emoji.name === '🇧') {
            buyRole('356625898256203786', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇨') {
            buyRole('356627174054428683', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇩') {
            buyRole('356627357450240010', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇪') {
            buyRole('356627412647411732', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇫') {
            buyRole('356627584727121920', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇬') {
            buyRole('449648158797070337', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '🇭') {
            buyRole('356627198985240577', 6000, 21, 0, user.id, reaction)
        }
        if (reaction.emoji.name === '💵') {
            buyRole('350036748404785153', 50000, 0, 0, user.id, reaction, true)
        }
        if (reaction.emoji.name === '💿') {
            buyRole('451217741584793601', 100000, 0, 0, user.id, reaction, true)
        }
        
    } else if (reaction.message.embeds[0].title === 'Level Token (LT) Shop') {
        if (reaction.emoji.name === '🇦') {
            buyLTRole('425328174919057429', 2, user.id)
        }
        if (reaction.emoji.name === '🇧') {
            buyLTRole('425328254308712458', 2, user.id)
        }
        if (reaction.emoji.name === '🇨') {
            buyLTRole('425328334117928970', 2, user.id)
        }
        if (reaction.emoji.name === '🇩') {
            buyLTRole('425328507778891777', 2, user.id)
        }
        if (reaction.emoji.name === '🇪') {
            buyLTRole('425328582219399168', 2, user.id)
        }
        if (reaction.emoji.name === '🇫') {
            buyLTRole('425328654588051457', 2, user.id)
        }
        if (reaction.emoji.name === '🇬') {
            buyLTRole('425328728139104256', 2, user.id)
        }
        if (reaction.emoji.name === '🇭') {
            buyLTRole('470748389844451329', 3, user.id)
        }
        if (reaction.emoji.name === '🇮') {
            buyLTRole('470748368788783114', 3, user.id)
        }
        if (reaction.emoji.name === '🇯') {
            buyLTRole('476888186119913474', 3, user.id)
        }
        if (reaction.emoji.name === '❤') {
            buyPerk('doubledaily', user.id, 6)
        }
        if (reaction.emoji.name === '💙') {
            buyPerk('blurryboxinc', user.id, 5)
        }
        if (reaction.emoji.name === '💛') {
            (async function () {
                try {
                    let songroles = chans.songroles
                    let hasall = true
                    let checkrow = await sql.get(`SELECT * FROM songroles WHERE id="${user.id}"`)
                    if (!checkrow) {
                        await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [user.id, ""])
                        checkrow = await sql.get(`SELECT * FROM songroles WHERE id="${user.id}"`)
                    }
                    if (typeof checkrow.data !== 'string') return msg.channel.send("`Error parsing your data.`")
                    for (let songr of songroles) {if (checkrow.data.indexOf(songr) === -1) hasall = false}
                    if (hasall) return reaction.message.channel.send('`You already have all the song roles!`').then((m) => {m.delete(2500)})
                    let doesnthave = false; let songrole;
                    while (!doesnthave) {
                        let ranrole = songroles[~~(Math.random() * songroles.length)]
                        if (checkrow && typeof checkrow.data === 'string' && checkrow.data.indexOf(ranrole) === -1) {
                            doesnthave = true
                            songrole = ranrole
                        }
                    }
                    console.log(songrole, /SONGROLE/)
                    buyLTRole(songrole, 1, user.id, 10000)
                } catch(err) {
                    console.log(err, /ERR/)
                }
            })()
        }
        if (reaction.emoji.name === '💚') {
            buyPerk('lvlcred', user.id, 4);
        }
        
    } else if (reaction.message.embeds[0].title === 'Level Badge Shop') {
        if (reaction.emoji.name === '🔵') {
            buyRole('449654670357692416', 0, 25, 0, user.id, reaction, true);
        }
        if (reaction.emoji.name === '🔴') {
            buyRole('449654893108527114', 0, 50, 0, user.id, reaction, true);
        }
        if (reaction.emoji.name === '⚫') {
            buyRole('449654945076215828', 0, 100, 0, user.id, reaction, true);
        }
    } 
    else if (reaction.message.embeds[0].title === 'Song Role Shop') {
        if (reaction.emoji.name === '🇦') {
            buyRole('562636490946117632', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇧') {
            buyRole('562636330560126977', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇨') {
            buyRole('562636475418673162', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇩') {
            buyRole('562636497354883072', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇪') {
            buyRole('562636493911490590', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇫') {
            buyRole('562636478534909953', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇬') {
            buyRole('562636481735294986', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇭') {
            buyRole('562636484520312846', 6000, 21, 0, user.id, reaction);
        }
        if (reaction.emoji.name === '🇮') {
            buyRole('562636487842070568', 6000, 21, 0, user.id, reaction);
        }
    }

    else if (reaction.message.embeds[0].title === 'Tier 1 Color Shop') {
        buyColorRole(0, reaction.emoji.name, user.id);
    }
    else if (reaction.message.embeds[0].title === 'Tier 2 Color Shop') {
        buyColorRole(1, reaction.emoji.name, user.id);
    }
    else if (reaction.message.embeds[0].title === 'Tier 3 Color Shop') {
        buyColorRole(2, reaction.emoji.name, user.id);
    }
    else if (reaction.message.embeds[0].title === 'Tier 4 Color Shop') {
        buyColorRole(3, reaction.emoji.name, user.id);
    }
   
})

async function buyColorRole(shopNum, emoji, id) {
    
    let channel = bot.guilds.get('269657133673349120').channels.get(chans.shop);
    let rolesArr = getRolesArr();
    let reactions = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '0⃣', '🇦', '🇧', '🇨', '🇩'];
    let roles = rolesArr[shopNum];
    let index = reactions.indexOf(emoji);
    
    let requirementsArr = [{level: 10, credits: 7500}, {level: 20, credits: 15000}, {level: 50, credits: 25000}, {level: 100, credits: 50000}];
    if (index < 0 || index >= roles.length || !roles[index]) return channel.send("`Invalid reaction`").then((m) => {m.delete()}, 2000);

    let role = roles[index];
    let requirements = requirementsArr[shopNum];

    //Already has role check
    console.log(role, /ROLE/)
    if (channel.guild.members.get(id).roles.get(role)) return  channel.send("`You already have this role1!`").then((m) => {m.delete()}, 2000);
    else {
        let checkrow = await sql.get(`SELECT * FROM songroles WHERE id="${id}"`);
        if (checkrow && checkrow.colordata && checkrow.colordata.indexOf(role) !== -1) return channel.send('`You already have this role in your inventory!`').then((m) => {m.delete(2500)}) 
    }
    //Level check
    let levelrow = await sql.get(`SELECT * FROM scores2 WHERE userId ="${id}"`);
    if (!levelrow || !levelrow.level || levelrow.level < requirements.level) return channel.send('`You must be level ' + requirements.level + ' to purchase this role.`').then((m) => {m.delete(2500)})
    //Credit check
    let creditrow = await sql.get(`SELECT * FROM daily WHERE userId ="${id}"`);
    if (!creditrow) return channel.send(`\`You need ${requirements.credits} more credits to purchase this!\``).then((m) => { m.delete(2500) });
    if (creditrow.xp < requirements.credits) {return channel.send('`You need ' + (requirements.credits - creditrow.xp) + ' more credits to buy this role.`').then((m) => { m.delete(2500) }) }
    
    //Give Role, Take Credits, add Role to SQL
    await sql.run(`UPDATE daily SET xp = ${(creditrow.xp - requirements.credits)} WHERE userId = ${id}`);
    let row = await sql.get(`SELECT * FROM songroles WHERE id="${id}"`);
    if (!row) {
        await sql.run("INSERT INTO songroles (id, data, colordata) VALUES (?, ?, ?)", [id, "", ""]);
        row = await sql.get(`SELECT * FROM songroles WHERE id="${id}"`);
    } else if (!row.colordata) {
        await sql.run(`UPDATE songroles SET colordata="" WHERE id=${id}`);
        row = await sql.get(`SELECT * FROM songroles WHERE id="${id}"`);
    }
    let curSongs = row.colordata.split(",");
    curSongs.push(role);
    let newData = curSongs.join(",");
    await sql.run(`UPDATE songroles SET colordata="${newData}" WHERE id="${id}"`);

    //DM and reply in #shop
    let dm = await channel.guild.members.get(id).createDM();
    let embed = new Discord.RichEmbed({title: "Your purchase"});
    embed.setDescription('You bought the ' + channel.guild.roles.get(role).name + ' color role for ' + requirements.credits + ' credits!');
    embed.setFooter((new Date()).toString());
    dm.send(embed);
    dm.send('**You can enable the color role you just bought by saying** `!choosecolor ' + channel.guild.roles.get(role).name + '` **in the commands channel!**')
    return channel.send('`You bought the ' + channel.guild.roles.get(role).name + ' color role for ' + requirements.credits + ' credits!`').then((m) => {m.delete(2500)})
}


async function buyRole(roleID, credits, level, daily, userid, reaction, notSongRole) {
    //checks
    let isSongRole = !notSongRole
    let member = bot.guilds.get('269657133673349120').members.get(userid)
    let channel = bot.guilds.get('269657133673349120').channels.get(chans.shop)
    //role check
    if (!isSongRole) {
        if (member.roles.get(roleID)) return channel.send('`You already have this role!`').then((m) => {m.delete(2500)})
    } else {
        let checkrow = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
        if (checkrow && checkrow.data && checkrow.data.indexOf(roleID) !== -1) return channel.send('`You already have this role!`').then((m) => {m.delete(2500)}) 
    }

    //level check
    sql.get(`SELECT * FROM scores2 WHERE userId ="${member.user.id}"`).then(row => {
        if (!row || !row.level || row.level < level) return channel.send('`You must be level ' + level + ' to purchase this role.`').then((m) => {m.delete(2500)})
        creditsCheck()
    })
    //credits check
    async function creditsCheck() {
        sql.get(`SELECT * FROM daily WHERE userId ="${member.user.id}"`).then(row => {
            if (!row) return channel.send(`\`You need ${daily} more daily uses!\``).then((m) => { m.delete(2500) })
            if ((!row.num && daily > 0) || row.num < daily) return channel.send(`\`You need ${row.num ? (daily - row.num) : daily} more daily uses!\``).then((m) => { m.delete(2500) })
            if (row.xp < credits) {return channel.send('`You need ' + (credits - row.xp) + ' more credits to buy this role.`').then((m) => { m.delete(2500) }) }
            else {
                sql.run(`UPDATE daily SET xp = ${(row.xp - credits)} WHERE userId = ${member.user.id}`);
                if (!isSongRole) member.addRole(roleID)
                else {
                    (async function() {
                        let row = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
                        if (!row) {
                            await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [userid, ""])
                            row = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
                        }
                        let curSongs = row.data.split(",")
                        curSongs.push(roleID)
                        let newData = curSongs.join(",")
                        await sql.run(`UPDATE songroles SET data="${newData}" WHERE id="${userid}"`)
                    })()
                }
                member.createDM().then((chan) => {
                    let embed = new Discord.RichEmbed({title: "Your purchase"})
                    embed.setDescription('You bought the ' + member.guild.roles.get(roleID).name + ' role for ' + credits + ' credits!')
                    embed.setFooter((new Date()).toString())
                    chan.send({embed: embed})
                    if (isSongRole) chan.send('**You can enable the song role you just bought by saying** `!choosesong ' + member.guild.roles.get(roleID).name + '` **in the commands channel!**')
                })
                return channel.send('`You bought the ' + member.guild.roles.get(roleID).name + ' role for ' + credits + ' credits!`').then((m) => {m.delete(2500)})
            }
        })
        
        
       
    }
}

async function buyDE(roleID, credits, level, daily, userid) {
    //checks
    let member = bot.guilds.get('269657133673349120').members.get(userid)
    let channel = bot.guilds.get('269657133673349120').channels.get(chans.shop)
    //role check
    if (member.roles.get(roleID)) return channel.send('`You already have this role!`').then((m) => {m.delete(2500)})

    //level check
    sql.get(`SELECT * FROM scores2 WHERE userId ="${member.user.id}"`).then(row => {
        if (!row || !row.level || row.level < level) return channel.send('`You must be level ' + level + ' to purchase this role.`').then((m) => {m.delete(2500)})
        creditsCheck()
    })

    //credits check
    async function creditsCheck() {
        sql.get(`SELECT * FROM daily WHERE userId ="${member.user.id}"`).then(async row => {
            let buyMsg = `\`You got the ${member.guild.roles.get(roleID).name} role back!\``;
            if (!member.roles.get("498702380007686146")) {
                buyMsg = '`You bought the ' + member.guild.roles.get(roleID).name + ' role for ' + credits + ' credits!`'
                if (!row) return channel.send(`\`You need ${daily} more daily uses!\``).then((m) => { m.delete(2500) })
                if ((!row.num && daily > 0) || row.num < daily) return channel.send(`\`You need ${row.num ? (daily - row.num) : daily} more daily uses!\``).then((m) => { m.delete(2500) })
                if (row.xp < credits) {return channel.send('`You need ' + (credits - row.xp) + ' more credits to buy this role.`').then((m) => { m.delete(2500) }) }
                sql.run(`UPDATE daily SET xp = ${(row.xp - credits)} WHERE userId = ${member.user.id}`);
                member.removeRole("498702380007686146");
                member.addRole(roleID);
                member.createDM().then((chan) => {
                    let embed = new Discord.RichEmbed({title: "Your purchase"})
                    embed.setDescription(buyMsg);
                    embed.setFooter((new Date()).toString())
                    chan.send({embed: embed})
                })
                return channel.send(buyMsg).then((m) => {m.delete(2500)})
            }    
            else {
                let response = await checkDE(member)
                if (typeof response === "string") {
                    if (response === "dema") channel.send('`You must wait at least one week before you can apply for DE again.`').then((m) => { m.delete(2500) })
                    else channel.send('`You do not meet the activity requirements for DE.`').then((m) => { m.delete(2500) })
                    return;
                }
                member.removeRole("498702380007686146");
                member.addRole(roleID);
                member.createDM().then((chan) => {
                    let embed = new Discord.RichEmbed({title: "Your purchase"})
                    embed.setDescription(buyMsg);
                    embed.setFooter((new Date()).toString())
                    chan.send({embed: embed})
                })
                return channel.send(buyMsg).then((m) => {m.delete(2500)})
            }
        })
    }
}

async function buyLTRole(roleID, ltreq, userid, credits) {
    let member = bot.guilds.get('269657133673349120').members.get(userid)
    let channel = bot.guilds.get('269657133673349120').channels.get(chans.shop)
    let credsrow = await sql.get(`SELECT * FROM daily WHERE userId ="${member.user.id}"`)
    let checkrow = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
    if (checkrow && checkrow.data && checkrow.data.indexOf(roleID) !== -1) return channel.send('`You already have this role!`').then((m) => {m.delete(2500)}) 
    if (credits && credits > 0 && credsrow.xp && credsrow.xp < credits) {return channel.send('`You need ' + (credits - credsrow.xp) + ' more credits to buy this role.`').then((m) => { m.delete(2500) }) }
    var leveltokens = JSON.parse(fs.readFileSync("./leveltokens.json", "utf8"))
    if (!leveltokens[userid] || !leveltokens[userid]['tokens'] || leveltokens[userid]['tokens'] <= 0) return channel.send('`You have no tokens!`').then((m) => m.delete(2500))
    if (ltreq > leveltokens[userid]['tokens']) return channel.send(`This item costs ${ltreq} tokens. You have ${leveltokens[userid]['tokens']}`).then((m) => m.delete(2500))
    sql.run(`UPDATE daily SET xp = ${(credsrow.xp - credits)} WHERE userId = ${member.user.id}`);
    leveltokens[userid]['tokens'] = leveltokens[userid]['tokens'] - ltreq
    writeJsonFile('leveltokens.json', leveltokens)
    // member.addRole(roleID)
    let row = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
    if (!row) {
        await sql.run("INSERT INTO songroles (id, data) VALUES (?, ?)", [userid, ""])
        row = await sql.get(`SELECT * FROM songroles WHERE id="${userid}"`)
    }
    let curSongs = row.data.split(",")
    curSongs.push(roleID)
    let newData = curSongs.join(",")
    await sql.run(`UPDATE songroles SET data="${newData}" WHERE id="${userid}"`)
    member.createDM().then((chan) => {
        let embed = new Discord.RichEmbed({title: "Your purchase"})
        embed.setDescription('You bought the ' + member.guild.roles.get(roleID).name + ' role for ' + ltreq + ' LT and ' + (Number.isFinite(credits) ? credits : 0) + ' credits!')
        embed.setFooter((new Date()).toString())
        chan.send({embed: embed})
        chan.send('**You can enable the song role you just bought by saying** `!choosesong ' + member.guild.roles.get(roleID).name + '` **in the commands channel!**')
    })
    return channel.send('`You bought the ' + member.guild.roles.get(roleID).name + ' role for ' + ltreq + ' LT and ' + (Number.isFinite(credits) ? credits : 0) + ' credits!`').then((m) => {m.delete(2500)})
    
}

function buyPerk(perkname, id, ltreq) {
    let channel = bot.guilds.get('269657133673349120').channels.get(chans.shop)
    var leveltokens = JSON.parse(fs.readFileSync("./leveltokens.json", "utf8"))
    if (!leveltokens[id] || !leveltokens[id]['tokens'] || leveltokens[id]['tokens'] === 0) return channel.send('`You have no tokens!`').then((m) => m.delete(2500))
    if (ltreq > leveltokens[id]['tokens']) return channel.send(`This item costs ${ltreq} tokens. You have ${leveltokens[id]['tokens']}`).then((m) => m.delete(2500))

    if (!perkname) return console.log(/PERKNAMEERROR/);
    
    sql.get(`SELECT * FROM perks WHERE userid = "${id}"`).then(row => {
      if (!row) {
        leveltokens[id]['tokens'] = leveltokens[id]['tokens'] - ltreq
        writeJsonFile('leveltokens.json', leveltokens)
        sql.run("INSERT INTO perks (userid, doubledaily, lvlcred, blurryboxinc) VALUES (?, ?, ?, ?)", [id, 0, 0, 0]).then(() => {
            console.log(perkname, /PERKNAME/)
            sql.run(`UPDATE perks SET ${perkname} ="${1}" WHERE userid ="${id}"`).catch(e => console.log(e.message, perkname, /1/))
            channel.guild.members.get(id).createDM().then((chan) => {
                let embed = new Discord.RichEmbed({title: "Your purchase"})
                embed.setDescription(`You bought ${perkname}!`)
                embed.setFooter((new Date()).toString())
                chan.send({embed: embed})
            })
            return channel.send(`You bought ${perkname}!`).then((m) => m.delete(2500))
        }).catch(e => console.log(e.message, perkname, /2/))
      } else {
        if (!row[perkname] || row[perkname] === 0) {
            leveltokens[id]['tokens'] = leveltokens[id]['tokens'] - ltreq
            writeJsonFile('leveltokens.json', leveltokens)
            console.log(perkname, /PERKNAME/)
            sql.run(`UPDATE perks SET ${perkname} ="${1}" WHERE userid ="${id}"`).catch(e => console.log(e.message, perkname, /3/))
            channel.guild.members.get(id).createDM().then((chan) => {
                let embed = new Discord.RichEmbed({title: "Your purchase"})
                embed.setDescription(`You bought ${perkname}!`)
                embed.setFooter((new Date()).toString())
                chan.send({embed: embed})
            })
            return channel.send(`You bought ${perkname}!`).then((m) => m.delete(2500))
        } else {
          channel.send(`You already have ${perkname.toUpperCase()}!`).then((m) => m.delete(2500))
        }
      }
    })
}

bot.on('voiceStateUpdate', (oldm, newm) => {
    let channels = bot.guilds.get('269657133673349120').channels.array()
    for (let channel of channels) {
        if (channel.type === 'voice') {
            let listeners = channel.members.array()
            if (channel.name.indexOf('Radio') !== -1) {
                let temp = channel.name.split('┋')
                let newstring = '🔵' + '┋' + temp[1] 
                channel.setName(newstring)
            }
            else if (listeners.length === 0) {
                let temp = channel.name.split('┋')
                let newstring = '⚫' + '┋' + temp[1] 
                channel.setName(newstring)
            } else {
                let temp = channel.name.split('┋')
                let newstring = '🔴' + '┋' + temp[1] 
                channel.setName(newstring)
            }
        }
    }
})


function websiteDay() {
    ontime({
        cycle: [ '30' ]
    }, function (ot) {
        console.log(new Date(), /ONTIME/)
        updateDay()
        ot.done()
        return
    })
}

let t = 0;
async function updateDay() {
    //if (t % 60 === 0) updateConcerts()
    t++
    let albumRelease = new Date("5 October 2018 00:00 EDT")
    let guild = bot.guilds.get('269657133673349120'), leaks = undefined, concertChan = undefined;
    if (guild) leaks = guild.channels.get(chans.leakstheories), concertChan = guild.channels.get("487830419149029376");
    if (guild && leaks) leaks.setTopic(calculateTimeRemaining(albumRelease) + " since Trench || READ #dmaorg-announcements AND #confirmed-fake-stuff FIRST! Discuss the return of the band here! (formerly #dmaorg-day..)");
    if (Math.random() < 0.25) { //Don't run as often lol
        console.log("Checking current concert...")
        let newName = await getCurrentConcert()
        if (guild && concertChan && concertChan.name !== newName) concertChan.setName(newName);
    }
}

async function getCurrentConcert() {
    return new Promise(async resolve => {
        //document.getElementsByClassName("Desktop__ItemLink-sc-7xzvm2-4 eXqHNt")[15].childNodes[1].childNodes[1].childNodes[1].innerText.split("·")[1].trim()
        let r = await snekfetch.get("https://seatgeek.com/twenty-one-pilots-tickets?oq=twenty+one+pilots");
        let dataToParseTemp = r.text;
        let $ = cheerio.load(dataToParseTemp);
        // $(".banner").children().children()[0].attribs.src
        let currentConcert = $(".Desktop__ItemLink-sc-7xzvm2-4.eXqHNt")[0].children[1].children[1].children[1].children[4].data.split(",")[0].trim().replace(" ", "-").toLowerCase().replace("saint", "st");
        resolve("the-bandito-tour-" + currentConcert);
    })
}

function round(num, dec) {
    return ((Math.floor(num * Math.pow(10, dec))) / Math.pow(10,dec))
}

process.on('uncaughtException', function (err) {
    bot.guilds.get('269657133673349120').channels.get('470406597860917249').send(err.toString() + ' (feeds-shop)')
	console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
	console.error(err.stack)
    console.log(/ERR/)
})

process.on('unhandledRejection', error => {
    console.log(error, /UNHANDLED_REJECTION/)
});


async function updateConcerts() {
    let concertChannels = bot.guilds.get("269657133673349120").channels.get("470461969430872064").children.array()
    for (let channel of concertChannels) {
        await new Promise(next => {
            let channelName = channel.name.split("-").join(" ").replace("st ", "saint ")
            seatgeek(channelName).then((details) => {
                let date = details.events[0].datetime_utc
                let date_split = date.split("T");
                let concertDate = new Date(date_split[0] + " " + date_split[1] + " UTC")
                let timeRemaining = calculateTimeRemaining(concertDate)
                let toTopic = timeRemaining + " until " + channel.name + " concert"
                if (channel.topic !== toTopic) {
                    channel.setTopic(toTopic); 
                    console.log("Updating " + channel.name + " topic..."); 
                    setTimeout(() => {next()}, 3000)}
                else next()
            }).catch(e => setTimeout(() => {next()}, 3000))
        })
    }
}

function calculateTimeRemaining(date, n) {
    let numDays = n ? n : 1
    let now = Date.now()
    let diff = date - now
    var delta = Math.abs(diff) / 1000;
    var days = Math.floor(delta / 86400).toString();
    delta -= days * 86400;
    var hours = (Math.floor(delta / 3600) % 24).toString();
    if (days <= numDays) {
        delta -= hours * 3600
        var minutes = (Math.floor(delta/60) % 60).toString();
        if (hours === "0" && days === "0") {
            delta -= minutes * 60
            var seconds = (Math.floor(delta) % 60).toString();
            return (minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"} and ` + seconds + ` second${parseInt(seconds) === 1 ? "" : "s"}`)
        } else return ((parseInt(hours) + (days*24)) + ` hour${parseInt(hours + (days*24)) === 1 ? "" : "s"} and ` + Math.ceil(parseInt(minutes) + ((Math.floor(delta - minutes * 60) % 60)) / 60) + ` minute${Math.round(parseInt(minutes) + ((Math.floor(delta - minutes * 60) % 60)) / 60) === 1 ? "" : "s"}`)
    } else return (days + ` day${parseInt(days) === 1 ? "" : "s"} and ` + hours + ` hour${parseInt(hours) === 1 ? "" : "s"}`)
}



function checkLink(link, type, channel, embed) {
    if (!type) throw new Error('Must provide type [checkLink func.]!')
    let alreadythere = false
    sql.all(`SELECT * FROM feeds WHERE type ="${type}"`).then((rows) => {
        for (let i in rows) {
            if (rows[i].link === link) alreadythere = true
        }
        if (!alreadythere) {
            sql.run("INSERT INTO feeds (type, link, date) VALUES (?, ?, ?)", [type, link, Date.now()]);
            channel.send(embed)
        }
    })
}

function getRolesArr() {
    class Role {
        constructor(name, hex) {
            this.name = name;
            this.hex = hex.startsWith("#") ? hex : "#" + hex;
        }
    }
    let rolesArr = [[], [], [], []];
    try {
        let roles = [];
        roles.push(new Role("----------TIER 1----------", "#FFFFFF"));
        roles.push(new Role("Cheetah Tan", "#AB9D85"));
        roles.push(new Role("Vulture Brown", "#7e7064"));
        roles.push(new Role("Bandito Green", "#74774A"));
        roles.push(new Role("----------TIER 2----------", "#FFFFFF"));
        roles.push(new Role("No Pink Intended", "#b18f95"));
        roles.push(new Role("Regional at Blue", "#aebfd8"));
        roles.push(new Role("Dema Gray", "#9B9BAD"));
        roles.push(new Role("Jumpsuit Green", "#40BF80"));
        roles.push(new Role("----------TIER 3----------", "#FFFFFF"));
        roles.push(new Role("Ned Blue",  "#C6E2FF"));
        roles.push(new Role("March to the Cyan", "#60ffee"));
        roles.push(new Role("Holding on to Blue", "#4a83e6"));
        roles.push(new Role("Forest Green", "#11806a"));
        roles.push(new Role("Trees Green", "#a9ff9f"));
        roles.push(new Role("Kitchen Pink", "#FF9DAE"));
        roles.push(new Role("Chlorine Pink", "#ff7d9a"));
        roles.push(new Role("Pink You Out", "#FF1493"));
        roles.push(new Role("The Red and Go", "#EA3A3F"));
        roles.push(new Role("Rebel Red", "#FF0000"));
        roles.push(new Role("Torch Orange", "#FF8C00"));
        roles.push(new Role("Fairly Lilac", "#ccacea"));
        roles.push(new Role("Pantaloon Purple", "#8f81ff"));
        roles.push(new Role("Pet Cheetah Purple", "#7113bd"));
        roles.push(new Role("----------TIER 4----------", "#FFFFFF"));
        roles.push(new Role("Clancy Black", "#000001"));
        roles.push(new Role("DMAORG White", "#FFFFFE"));

        let index = -1;
        let songIndex = 0;
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].hex === "#FFFFFF") {
                index++;
                songIndex = 0;
            }
            else {
                let role = bot.guilds.get("269657133673349120").roles.find(r => { return r.name.toLowerCase() === roles[i].name.toLowerCase() });
                if (role) {
                    rolesArr[index][songIndex++] = role.id;
                }
                else console.log(roles[i].name + " " + roles[i].hex, /NOT FOUND/)
            }
        }
        return rolesArr;
    } catch (e) {
        console.log(e, /CCERR/);
        return null;
    }
}

bot.on('error', (err) => {
    console.log(err, /err/);
    let channel = bot.guilds.get("269657133673349120") ? bot.guilds.get("269657133673349120").channels.get("470406597860917249") : undefined;
    if (channel) channel.send(err.message + " (feeds-shop)")
    if (channel) channel.send(err.toString())
});

/* OLD TWEET CODE

    function tweetLooker() {
        ontime({
            cycle: '06:00:00'
        }, function (ot) {
            onOnTime()
            ot.done()
            return
        })
    }
    let tweets = JSON.parse(fs.readFileSync("./tweets.json", "utf8"));
    let tweetsOfToday = []
    let today = new Date()
    let day = today.getDate()
    bot.guilds.get('269657133673349120').channels.get(chans.twitterfeed).send(day)
    let month = today.getMonth()
    let year = today.getFullYear()
    for (let key in tweets) {
        let tweet = tweets[key]
        let then = new Date(tweet.date)
        let thenday = then.getDate()
        let thenmonth = then.getMonth()
        let thenyear = then.getFullYear()
        if (thenday === day && thenmonth === month) {
            tweetsOfToday.push({tweet: tweet.link, ago: year-thenyear})
        }
    }
    if (tweetsOfToday.length === 0) {return bot.guilds.get('269657133673349120').channels.get(chans.twitterfeed).send('`There are no historic tweets for today! Check back tomorrow`')}
    else {
        let min = 12 * 30
        let interval = ~~(min / (tweetsOfToday.length))
        let intervalStr = interval + ' minute(s)'
        if (interval > 60) {
            let hours = ~~(interval / 60)
            intervalStr = hours + ' hour(s) and ' + (interval - hours * 60) + ' minute(s)'
        }
        bot.guilds.get('269657133673349120').channels.get(chans.twitterfeed).send('`There are ' + (tweetsOfToday.length) + ' historic tweets for today! They will be sent out every ' + intervalStr + '!`')
        
        let current = 0
        sendTweet()
        let int2 = setInterval(() => {
            if (current >= tweetsOfToday.length) {
                bot.guilds.get('269657133673349120').channels.get(chans.twitterfeed).send('`There are no more tweets for today! Check back tomorrow.`')
                return clearInterval(int2)
            }
            sendTweet()
        }, interval * 60 * 1000)

        function sendTweet() {
            let ago = tweetsOfToday[current].ago + ' years ago...\n'
            if (tweetsOfToday[current].ago === 1) ago = tweetsOfToday[current].ago + ' year ago...\n'
            bot.guilds.get('269657133673349120').channels.get(chans.twitterfeed).send(ago + tweetsOfToday[current].tweet)
            T_POST.post('statuses/update' , { status: `${tweetsOfToday[current].ago} year${tweetsOfToday[current].ago == 1 ? "" : "s"} ago... ${tweetsOfToday[current].tweet}` }, function(err, data, response) {
                console.log('posting success')
            })
            current++
        }

    }
*/