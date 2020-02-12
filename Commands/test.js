module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;

        let shopChan = msg.guild.channels.get(chans.shop);
        let msgs = (await shopChan.fetchMessages({ limit: 100 })).array();

        for (let m of msgs) {
            await m.delete();
            await new Promise(next => setTimeout(next, 1000));
        }
    }



    // let allMessages = await fetchAllMessages(500);

    // let html = "<head>\n  <style>\n    body {background-color: #36393f}\n   .avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

    // for (let m of allMessages) {
    //     if (m.content || m.attachments) {
    //         let registered = false;
    //         let mhtml = "<div>\n"
    //         mhtml += `<img class="avatar" src="${m.author.displayAvatarURL}" align="left" height=40/><span class="username"><b>${m.member.displayName}</b></span>  <span class="timestamp">(${m.author.id})</span>\n`
    //         mhtml += `<p display="inline" class="timestamp"> ${m.createdAt.toString().replace("Central Standard Time", m.createdTimestamp)} </p>\n`
    //         if (m.content) {
    //             mhtml += `<p class="textcontent">${fixEmojis(m.content)}</p>`;
    //             registered = true;
    //         }
    //         if (m.attachments) {
    //             let attachments = m.attachments.array();
    //             for (let a of attachments) {
    //                 if (a.filename.endsWith("png" || a.filename.endsWith("gif") || a.filename.endsWith("jpg"))) {
    //                     let _file = await snekfetch.get(a.url);
    //                     let base64 = _file.body.toString('base64');
    //                     console.log(base64.substring(0, 100), "base64")
    //                     html += `\n<img src="data:image/jpeg;base64,${base64}"><br><br>`;
    //                     registered = true;                           ;
    //                 }
    //             }
    //         }
    //         if (registered) html += mhtml + "\n</div><br>\n";
    //     }

    // }
    // console.log("creating attachment")
    // let attachment = new Discord.Attachment(Buffer.from(html), "jail.html");
    // msg.channel.send(attachment);

    // function fixEmojis(text) {
    //     let regCapture = /<(a{0,1}):\w+:(\d{18})>/
    //     while (regCapture.test(text)) {
    //         let results = regCapture.exec(text);
    //         let ending = results[1] && results[1] === "a" ? "gif" : "png";
    //         let id = results[2];
    //         let newText = `<img src="https://cdn.discordapp.com/emojis/${id}.${ending}" height=20>`;
    //         text = text.replace(regCapture, newText);
    //     }
    //     return text;
    // }

    // async function fetchAllMessages(limit=500) {
    //     let messages = {};
    //     let lastMessage = null;

    //     fetcher:
    //     while (Object.keys(messages).length < limit) {
    //         let options = { limit: 100 };
    //         if (lastMessage) options.before = lastMessage;
    //         console.log("Fetching...")
    //         let msgs = (await msg.channel.fetchMessages(options)).array();
    //         if (!msgs || !msgs[msgs.length - 1] || msgs[msgs.length - 1].id === lastMessage) break fetcher;
    //         for (let m of msgs) {
    //             messages[m.id] = m;
    //         }
    //         lastMessage = msgs[msgs.length - 1].id;
    //     }
    //     let finalArray = [];
    //     for (let id in messages) {
    //         finalArray.push(messages[id])
    //     }
    //     return finalArray.reverse();
    // }
    // if (msg.author.id !== poot) return;
    //     let msgs = (await msg.channel.fetchMessages()).array();
    //     for (let m of msgs) {
    //         await m.delete();
    //         console.log("deleted!");
    //         await new Promise(next => setTimeout(next, 1000));
    //     }
    //     return;
    // let m = await msg.channel.send(`Taking average of ${arr.length} users' pfps`);
    // for (let i = 4730; i < arr.length; i++) {
    //     if (i % 27 === 0) await fs.promises.writeFile("colorresults.json", JSON.stringify(results));
    //     await new Promise(async next => {
    //         let r = await snekfetch.get(arr[i].user.displayAvatarURL);
    //         average(r.body, async (err, color) => {
    //             var [red, green, blue, alpha] = color;
    //             let d = Math.sqrt(Math.pow(red - 165, 2) + Math.pow(green - 196, 2) + Math.pow(blue - 191, 2));
    //             results.push({ id: arr[i].user.id, distance: d });
    //             if (i % 10 === 0) await m.edit(arr[i].displayName + " " + i);
    //             await new Promise(done => setTimeout(done, 500));
    //             next();
    //         });
    //     });
    // }
    // m.edit("Done");





    ,
    info: {
        aliases: false,
        example: "!test",
        minarg: 0,
        description: "Test command",
        category: "NA"
    }
};


// if (msg.author.id !== poot) return;
// let m = await msg.channel.fetchMessage("602635979408408587");
// let newEmbed = new Discord.RichEmbed(m.embeds[0]);
// newEmbed.setThumbnail("attachment://albums.png");
// newEmbed.fields[0].name = "Song 1";
// newEmbed.fields[2].name = "Song 2";
// await m.edit(newEmbed);

// let bgURL = "https://i.imgur.com/SglNgFH.png";
// let fgURL = await messageToImage(msg, 1200, 400);

// let topLeft = { x: 3*214, y: 3*229.3333282470703 };
// let topRight = { x: 3*520, y: 3*226.3333282470703 };
// let botLeft = { x: 3*259, y: 3*287.3333282470703 };
// let botRight = { x: 3*478, y: 3*285.3333282470703 };
// let sign_buffer = await overlayImage(bgURL, fgURL, topLeft, topRight, botLeft, botRight, false, true);
// if (!sign_buffer) return msg.channel.embed("Error!");
// await msg.channel.send(new Discord.Attachment(sign_buffer, "overlay.png"));

/*
msg.content = removeCommand(msg.content);
let buffer = await messageToImage(msg, true);
msg.channel.send(new Discord.Attachment(buffer, "img.png"));
*/
// let role = "283272728084086784";


// let m = await msg.channel.send(`Removing ${msg.guild.roles.get(role).name} role...`)
// let members = msg.guild.roles.get(role).members.array();

// for (let member of members) {
//     await m.edit(`Removing ${msg.guild.roles.get(role).name} role from \`${member.displayName}...\``)
//     member.removeRole(role);
//     await new Promise(next => {
//         setTimeout(() => {
//             next();
//         }, 1000)
//     })
// }

// msg.channel.embed("Done.")

// if (msg.author.id !== poot) return msg.delete();
// if (!msg.mentions || !msg.mentions.users || !msg.mentions.users.first()) return;
// let id = msg.mentions.users.first().id;
// let msgsDay = 0;
// if (msgcountJSON[id]) {
//     for (let key in msgcountJSON[id]) msgsDay += msgcountJSON[id][key];
// }
// msgsDay = Math.floor(msgsDay / 7);
// msg.channel.embed(msgsDay + " messages/day");


/*

if (msg.author.id !== poot) return msg.delete();
        if (!msg.mentions || !msg.mentions.users || !msg.mentions.users.first()) return;
        let id = msg.mentions.users.first().id;
        let msgsDay = 0;
        if (msgcountJSON[id]) {
            for (let key in msgcountJSON[id]) msgsDay += msgcountJSON[id][key];
        }
        msgsDay = Math.floor(msgsDay / 7);
        msg.channel.embed(msgsDay);


let id = "574731157061632000";

        // let mention = msg.mentions && msg.mentions.members && msg.mentions.members.first() ? msg.mentions.members.first() : null;

        // if (!mention) return msg.delete();

        //CLOWN UP
        console.log("peepee")
        if (msg.content.indexOf("add") !== -1) {
            let channels = msg.guild.channels.array();

            for (let chan of channels) {
                let perm = chan.permissionOverwrites.get(id);
                if (!perm && chan.id !== "569184705379827747") {
                    await chan.overwritePermissions(id, {
                        VIEW_CHANNEL: false
                    })
                }
            }

            // await mention.addRole("498702380007686146");
            // await mention.removeRole("283272728084086784");
            // await mention.addRole(id);

            msg.channel.embed("Done.");
            } else {
            let channels = msg.guild.channels.array();
            for (let chan of channels) {
                console.log(chan.name, /NAME/)
                try {
                    let perm = chan.permissionOverwrites.get(id);
                    if (perm) await perm.delete();
                } catch (e) {
                    msg.channel.embed(e.message ? e.message : e.toString());
                }

            }

            // await mention.removeRole("498702380007686146");
            // await mention.addRole("283272728084086784");
            // await mention.removeRole("569330362749026304")

            msg.channel.embed("Done.")
        }
*/


// let content = removeCommand(msg.content);
// await sql.run(`UPDATE scavenger SET hint="${content}" WHERE userId ="QUIET"`);



/*


try {
            let m = await msg.channel.send("Prepping...");
            let embed = new Discord.RichEmbed().setColor("RANDOM");
            embed.addField(`0`, `[🔴 Button 1](https://dmascavenge.info/button?id=${m.id}&channel=${m.channel.id}&option=1)`);
            embed.addField(`0`, `[🔵 Button 2](https://dmascavenge.info/button?id=${m.id}&channel=${m.channel.id}&option=2)`);
            await m.edit(embed);
        } catch(e) {
            console.log(e, /ERROR/)
        }
*/

/* CLOWN

*/
