module.exports = async function (msg, bot, sql) {
    const loadJsonFile = require("load-json-file");
    const writeJsonFile = require("write-json-file");

    function msToString(ms) {
        let diff = ms;
        let days = Math.floor(diff / (1000 * 86400));
        diff -= days * (1000 * 86400);
        let hours = Math.floor(diff / (1000 * 3600));
        diff -= hours * (1000 * 3600);
        let minutes = Math.floor(diff / (1000 * 60));
        diff -= minutes * (1000 * 60);
        let seconds = diff / 1000;
        return days + " day" + (days === 1 ? ", " : "s, ") + hours + " hour" + (hours === 1 ? ", " : "s, ") + minutes + " minute" + (minutes === 1 ? ", " : "s, ") + seconds + " seconds";
    }


    if (parsing) {
        console.log("Message sent while parsing from " + msg.member.displayName);
        return msg.delete();
    }
    if (!interval) createInterval();

    if (msg.content.startsWith("!") && msg.author.id === poot) return;

    parsing = true;

    const roleToUse = "269660541738418176";
    const { createCanvas, loadImage, Image, registerFont } = require("../json/canvas/index.js");
    registerFont(("./assets/fonts/compacta.ttf"), { family: "compacta1" }); // eslint-disable-line max-len
    registerFont(("./assets/fonts/NotoEmoji-Regular.ttf"), { family: "compacta1" }); // eslint-disable-line max-len 
    msg.content = msg.content.replace(/\n/g, " ");
    try {
        console.log("updated");
        //REMOVE BEFORE STARTING :)
        // if (msg.content !== "test" && msg.content !== "restartgame") return;
        await msg.channel.bulkDelete(5);

        try {
            await msg.channel.overwritePermissions(roleToUse, {
                SEND_MESSAGES: false
            });
            if (msg.author.id !== "221465443297263618") await msg.channel.overwritePermissions(msg.author.id, {
                SEND_MESSAGES: false
            });
        } catch (e) {
            console.log(e, /CHANERR/);
        }

        let row = await sql.get("SELECT * FROM scavenger WHERE userId=\"QUIET\"");
        if (!row || !row.timestart) {
            await sql.run("INSERT INTO scavenger (userId, timestart, pausestart, hint, extract) VALUES (?, ?, ?, ?, ?)", ["QUIET", Date.now(), 0, "", ""]);
            console.log("running first time");
            await sendStartEmbed(bot.user.id, 0, NaN, "???", ".");
        } else if (msg.author.id === "221465443297263618" && msg.content === "restartgame") {
            await sql.run("DELETE FROM scavenger WHERE userId=\"QUIET\"");
            await msg.channel.embed("Game restarted.");
            await msg.channel.overwritePermissions(roleToUse, {
                SEND_MESSAGES: true
            });
            parsing = false;
        } else {
            let startTime = row.timestart;
            let totalTime = Date.now() - startTime;
            sendStartEmbed(msg.author.id, totalTime, row.pausestart ? row.pausestart : totalTime, row.extract ? row.extract.toString() : "None", row.hint ? row.hint.toString() : "None");
        }

        async function sendStartEmbed(lastUser, lastTime, bestTime, topUser, bestMessage) {
            if (lastTime > bestTime || isNaN(bestTime)) {
                let json = await loadJsonFile("./json/quietgame.json");
                if (!json.times || !json.bestTimes) json = { times: [], bestTimes: [] };
                json.bestTimes.push(Date.now());
                console.log("updating best things");
                bestTime = lastTime;
                topUser = `<@${msg.author.id}>`;
                bestMessage = msg.content;
                createInterval();

                // let perms = msg.channel.permissionOverwrites.array();
                // for (let perm of perms) {
                //     if (perm.type === "member") await perm.delete();
                // }
                if (msg.author.id !== "221465443297263618") await msg.channel.overwritePermissions(msg.author.id, {
                    SEND_MESSAGES: false
                });
                await writeJsonFile("./json/quietgame.json", json);
            } else {
                let json = await loadJsonFile("./json/quietgame.json");
                if (!json.times || !json.bestTimes) json = { times: [], bestTimes: [] };
                json.times.push(Date.now());
                await writeJsonFile("./json/quietgame.json", json);
            }

            //PERCENT OF 24 HOURS
            let r, g;
            let percent1 = Math.min(1, bestTime / (86400 * 1000));
            let angle1 = 2 * Math.PI - Math.min(percent1 * 2 * Math.PI, 2 * Math.PI);
            // let percent2 = Math.min(1, lastTime / (86400 * 1000));
            // let angle2 = 2 * Math.PI - Math.min(percent2 * 2 * Math.PI, 2 * Math.PI);

            console.log("before canvas");
            let canvas = createCanvas(800, 1050);
            console.log("canvas");
            let ctx = canvas.getContext("2d");
            let background = await loadImage("./images/QUIETGAME.png");
            let ned = await loadImage("./images/NED.png");
            let nedred = await loadImage("./images/NEDRED.png");

            ctx.font = "20px compacta1";
            ctx.drawImage(background, 0, 0, 800, 1050);
            let fillColors = ["#D9D9D9"];
            fillColors.reverse();
            let fillIndex = 0;
            ctx.fillStrokeText = (text, x, y) => {
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 4;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = fillColors[fillIndex++ % fillColors.length];
                ctx.fillText(text, x, y);
            };
            //CURRENT
            console.log("current");
            //TIME
            console.log(msToString(lastTime), /LAST TIME/);
            await getSize(ctx, msToString(lastTime), 550, 100);
            ctx.fillStrokeText(msToString(lastTime), 200, 450);
            //USER
            await getSize(ctx, msg.member.displayName, 530, 100);
            console.log(msg.member.displayName, /CCURENTNAME/);
            ctx.fillStrokeText(msg.member.displayName, 213, 507);
            //MESSAGE
            let lines = await getMessageSize(ctx, msg.content, 650, 80);
            let hStats = ctx.measureText("TEST");
            let height = hStats.emHeightAscent + hStats.emHeightDescent;
            for (let i = 0; i < lines.length; i++) {
                console.log(lines[i].trim(), new RegExp("CLINE " + i));
                ctx.fillStrokeText(lines[i].trim(), 43, 567 + height + (height + 5) * i);
                if (i !== lines.length - 1) fillIndex--;
            }

            //BEST
            console.log("best");
            //TIME
            await getSize(ctx, msToString(bestTime), 530, 100);
            ctx.fillStrokeText(msToString(bestTime), 200, 795);
            console.log(msToString(bestTime), /BESTTIME/);
            //USER
            let name = msg.guild.members.get(topUser.replace(/<|@|>/g, "")) ? msg.guild.members.get(topUser.replace(/<|@|>/g, "")).displayName : "N/A";
            await getSize(ctx, name, 530, 100);
            ctx.fillStrokeText(name, 213, 852);
            console.log(name, /BESTNAME/);
            //MESSAGE
            let lines2 = await getMessageSize(ctx, bestMessage, 650, 80);
            let hStats2 = ctx.measureText("TEST");
            let height2 = hStats2.emHeightAscent + hStats2.emHeightDescent;
            for (let i = 0; i < lines2.length; i++) {
                console.log(lines2[i].trim(), new RegExp("BLINE " + i));
                ctx.fillStrokeText(lines2[i].trim(), 43, 912 + height2 + 20 * i);
                if (i !== lines2.length - 1) fillIndex--;
            }
            console.log("after best");
            //DRAW CIRCLE AROUND NED

            //LAST TIME

            ctx.drawImage(ned, 3, 14);
            ctx.drawImage(ned, 3, 14);
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = "#d9d9d9";
            ctx.beginPath();
            ctx.moveTo(53, 38);
            ctx.arc(53, 38, 53, 0, angle1);
            ctx.lineTo(53, 38);
            ctx.closePath();
            ctx.fill();

            console.log("after ned");

            let attachment = new bot.Discord.Attachment(canvas.toBuffer(), "quiet.png");
            console.log(attachment, /ATTACHMENT/);
            try {
                await msg.channel.send(attachment);
            } catch(e) {
                console.log(e, /SENDBUFFER/);
            }
            
            console.log("sent attachment");
            await msg.channel.overwritePermissions(roleToUse, {
                SEND_MESSAGES: true
            });
            // let newTopic = msToString(bestTime);
            // if (msg.channel.topic !== newTopic) msg.channel.setTopic(newTopic);
            parsing = false;

            //EMBED FOR LOGGING
            let embed = new bot.Discord.RichEmbed().setColor([r, g, 0]);
            embed.setTitle("THE QUIET GAME.");
            if (lastUser) embed.addField("\u200b", "**PREVIOUS**");
            if (lastTime) embed.addField("Time: ", msToString(lastTime));
            if (lastUser) embed.addField("Ended by: ", `<@${msg.author.id}>`);
            if (lastUser) embed.addField("Message: ", msg.content);
            await msg.guild.channels.get("495471332151132170").send(embed);
            
            try {
                await sql.run(`UPDATE scavenger SET timestart="${Date.now()}", pausestart="${bestTime}", extract="${topUser}", hint="${lines2.join(" ")}" WHERE userId ="QUIET"`);
            } catch (e) {
                console.log(e, /ERROR/);
            }

        }

        
    } catch (e) {
        console.log(e);
    }

    async function createInterval() {
        if (interval) clearInterval(interval);
        interval = setInterval(async () => {
            let row = await sql.get("SELECT * FROM scavenger WHERE userId=\"QUIET\"");
            if (!row || !row.timestart) clearInterval(interval), interval = null;
            else {
                let startTime = row.timestart;
                let totalTime = Date.now() - startTime;
                let timeString = msToString(totalTime);
                let secondsArr = timeString.split(".")[0].split(",");
                let seconds = secondsArr[secondsArr.length - 1];
                if (seconds % 5 === 0) msg.channel.setTopic("Current time: " + timeString.split(".")[0] + " seconds // No NSFW, gross, mean, or harmful messages allowed.");
            }
            
        }, 1000);
    }

    async function getSize(ctx, text, w, h) {
        let size = 40;
        let found = false;
        while (size > 9 && !found) {
            ctx.font = size + "px compacta1";
            let metrics = ctx.measureText(text);
            if (metrics.width < w && metrics.emHeightAscent + metrics.emHeightDescent < h) {
                found = true;
                return size;
            }
            else size--;
        }
        return size;
    }

    async function getMessageSize(ctx, in_text, w, h, isRecurring) {
        let lines = [];
        let words = in_text.split(" ");
        let fontSize = isRecurring ? 40 : 40;

        while (fontSize > 9) {
            ctx.font = fontSize + "px compacta1";
            let stats = ctx.measureText("TestW");
            let height = stats.emHeightAscent + stats.emHeightDescent + 5;
            let start = 0;
            let end = 1;
            let exited = false;


            if (words.length === 1) {
                console.log(words[0], "word length 1");
                if (ctx.measureText(words[0]).width > w) {
                    fontsize = 0;
                    let newText = in_text.replace(/\.\.\./g, "");
                    return await getMessageSize(ctx, newText.substring(0, newText.length - 2) + "...", w, h, true);
                }
                else return [words[0]];
            } else {
                while (end < words.length + 10 && !exited) {
                    let text_array = words.slice(start, end);
                    let text = text_array.join(" ");
                    if (ctx.measureText(text).width > w) {
                        text_array = words.slice(start, end - 1);
                        text = text_array.join(" ");
                        lines.push(text);
                        start = end - 1;
                    } else if (end >= words.length) {
                        lines.push(text);
                        start = end;
                        end = words.length + 15;
                    }
                    end++;
                    let totalHeight = lines.length * height;
                    if (totalHeight > h) {
                        end = words.length + 15;
                        lines = [];
                        exited = true;
                    }
                }
                let allFit = true;
                for (let line of lines) {
                    if (ctx.measureText(line).width >= w) {
                        allFit = false;
                        console.log(line, ctx.measureText(line).width, w, /COMPARE/);
                    }
                }
                if (!exited && lines.length > 0 && allFit) return lines;
            }
            fontSize--;
        }
        return await getMessageSize(ctx, in_text.substring(0, in_text.length - 20) + "...", w, h, true);
    }
};




/*
for (let count = 0; count < 4; count++) {
            let size = 40;
            lines = [];
            if (count > 0) {
                let length = text.length;
                let percent = (1/(count+1));
                let interval = percent * length;
                for (let i = 0; i < count; i++) {
                    let start = Math.floor(i * interval);
                    let end = Math.floor((i+1) * interval);
                    let string = text.substring(start, end);
                    lines.push(string);
                }
            } else lines = [text];
            

            while (size > 15 && !found) {
                ctx.font = size + 'px compacta1';
                let fits = true;
                for (let line of lines) {
                    let metrics = ctx.measureText(line);
                    if (metrics.width >= w) fits = false;
                }
                if (fits) return lines;
                size--;
            }
            
        }
        return [text];
*/