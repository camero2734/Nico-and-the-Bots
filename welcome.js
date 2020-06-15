require("dotenv").config();
//module grabbing
const fs = module.require("fs");
const Discord = require("discord.js");
const bot = new Discord.Client({ autoReconnect: true, max_message_cache: 0, fetchAllMembers: true  });
var Canvas = require("canvas");
const snekfetch = require("snekfetch");
const chalk = require("chalk");
let chans = JSON.parse(fs.readFileSync("channels.json"));

let memberQueue = [];

bot.on("ready", async () => {
    console.log("UP!!!!!!");
    console.log(chans.bottest, /CHANS/);

    let guild;
    let botTestChannel;
    while (!botTestChannel) {
        console.log("channel/guild undefined");
        guild = bot.guilds.get("269657133673349120");
        if (guild) botTestChannel = guild.channels.get(chans.bottest);
        await new Promise(next => setTimeout(next, 300));
    }
    autoAddRoles(guild);
    runMemberQueue(guild);
    botTestChannel.send("`Welcome Bot Running!`");
});

bot.on("message", (msg) => {
    if (msg.content.startsWith("^ping")) {
        msg.reply("u look like a pong (welcome is running)");
    }
});

bot.on("guildMemberAdd", async (member) => {
    if (member.user.username.indexOf(chans.swearWords[4]) !== -1) {
        console.log("Inappropriate name detected. Banning user.");
        member.ban("Auto-detected inappropriate name on join.");
        member.guild.channels.get(chans.staff).send(`<@${member.user.id}> (${member.user.username}) was banned for having an inappropriate name upon joining.`);
        return;
    }

    memberQueue.push(member.user.id);

    let guild = member.guild;
    let welcomeChan = guild.channels.get(chans.welcome);
    // await welcomeChan.send(`Welcome <@${member.user.id}>! See <#721047257029279844> for details on the new LOC arg!`);
    sendWelcome(member, welcomeChan);
});

bot.login(process.env.SACARVER_TOKEN);

async function autoAddRoles(guild) {
    let members = guild.members.array();
    for (let mem of members) {
        if (!mem.roles.get("269660541738418176") && !mem.roles.get("278225702455738368") && memberQueue.indexOf(mem.user.id) === -1) {
            memberQueue.push(mem.user.id);
        }
    }
    await new Promise(next => setTimeout(next, 60 * 1000));
    autoAddRoles(guild);
}

async function runMemberQueue(guild) {
    for (let id of memberQueue) {
        let time = 500;
        console.log(`[${chalk.red(getTime())}] ${chalk.cyan(`Adding role to @${id}`)}`);
        try {
            let mem = await guild.fetchMember(id);
            if (!mem.roles.get("269660541738418176")) {
                if (!mem.roles.get("430170511385952267")) await mem.addRoles(["269660541738418176", "430170511385952267"]);
                else await mem.addRoles(["269660541738418176"]);
                console.log(chalk.green(`\tsucceeded`));
            } else {
                console.log(chalk.yellow(`\talready had`));
                time = 0;
            }

        } catch(e) {console.log(chalk.red(`\tfailed`), e)}

        await new Promise(next => setTimeout(next, time));
    }

    if (memberQueue.length === 0) await new Promise(next => setTimeout(next, 100));
    else memberQueue = [];
    runMemberQueue(guild);
}

async function sendWelcome(member, welcomeChan) {
    await sendWelcomeImage(member, welcomeChan);
    await welcomeChan.send(
        `Welcome <@${member.user.id}> to the twenty one pilots Discord server!\n` +
        `**__A few channels you might wanna check out:__**\n` +
        `<:trenchlogo:466653201077370880> <#${chans.hometown}> - The main chat channel- talk with other members here!\n` +
        `<:nedtea:562152080383541259> <#${chans.commands}> - Use bot commands! For a quick guide to some commands, say \`!guide\` in the channel.\n` +
        `<:LEAK:404458877393043466> <#${chans.tyler}> <#${chans.josh}> <#${chans.band}> -  Social media posts from the band show up here!\n` +
        `<:TylerBanger:562764855124295690> <#${chans.rules}> - A list of the rules and guidelines for our server.\n` +
        `<:questionmarkFCE300:664678208578256908> <#${chans.lvlcnrn}> <#${chans.leakstheories}> - Channels to stay up-to-date and discuss the LOC game!\n\n` +
        `To be notified if the band posts on social media or dmaorg.info updates, say !topfeed in #commands!`
    );
    let ch = await member.user.createDM();
    await ch.send("__**Here are some basic server rules to keep in mind!**__\n      -Discord terms requires users to be 13 or older\n      -Respect everyone\n      -Keep in mind that this server is public, so __never__ post personal information\n      -Don't make others uncomfortable\n      -No advertising other discord servers\n      -Do not cause public drama\n      -Try not to create loopholes to justify bad behavior (Use common sense)\n      -Listen to the staff; DM an admin if there is a major problem\n      -No NSFW or spam\n      -Make sure to direct content to their appropriate channels (i.e. bot use in #commands)\n      \nWe recommend you read #rules and use !guide in #commands in order to familiarize yourself with the channels and commands. Have fun!\nhttps://imgur.com/vMD3Cey");
}

async function sendWelcomeImage(member, welcomeChan) {
    return new Promise(resolve => {
        var canvas = new Canvas.Canvas(500, 250);
        var ctx = canvas.getContext("2d");
        Canvas.registerFont(("./assets/fonts/h.ttf"), { family: "futura" });
        Canvas.registerFont(("./assets/fonts/f.ttf"), { family: "futura" });
        ctx.font = "30px futura";
        ctx.fillStyle = "#FCE300";
        ctx.textAlign = "left";
        let img = new Canvas.Image();
        img.onload = async function () {
            ctx.drawImage(img, 0, 0);
            ctx.font = "60px futura";
            ctx.fillText("Welcome!", 150, 103);
            let maxWidth = 340;
            let maxHeight = 30;
            let measuredTextWidth = 1000;
            let measuredTextHeight = 1000;
            let checkingSize = 100;
            while ((measuredTextWidth > maxWidth || measuredTextHeight > maxHeight) && checkingSize > 5) {
                checkingSize--;
                ctx.font = checkingSize + "px futura";
                let textInfo = ctx.measureText(member.displayName);
                measuredTextWidth = textInfo.width;
                measuredTextHeight = textInfo.emHeightAscent + textInfo.emHeightDescent;
            }
            ctx.font = checkingSize + "px futura";
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(member.displayName, 150, 158);
            //member number
            let num = member.guild.memberCount;
            ctx.font = "20px futura";
            ctx.textAlign = "right";
            ctx.fillStyle = "white";
            ctx.fillText("Member #" + num, 460, 208);
            var las = member.user.displayAvatarURL.split("?").reverse().pop();

            let las_res = await snekfetch.get(las);
            let img2 = new Canvas.Image();
            setTimeout(() => {
                img2.src = las_res.body;
                let size = 72;
                ctx.drawImage(img2, 88 - (size / 2), 44, size, size);
                welcomeChan.send({ file: canvas.toBuffer() }).then(() => {
                    resolve();
                });
            }, 250);




        };
        img.src = "images/welcome.png";
    });
}
bot.on("error", (err) => {
    console.log(err, /err/);
    let channel = bot.guilds.get("269657133673349120") ? bot.guilds.get("269657133673349120").channels.get("470406597860917249") : undefined;
    if (channel) channel.send(err.message + " (welcome)");
    if (channel) channel.send(err.toString());
});

function getTime() {
    let pad = (t) => t < 10 ? "0" + t : "" + t;
    let d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}
