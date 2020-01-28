module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;
        
        let jailChan = msg.channel;
        if (!jailChan || !jailChan.name) return msg.channel.embed("Error!");
        if (!jailChan.name.endsWith("chilltown") || jailChan.parentID !== "625524136785215498") {
            return msg.channel.embed(`This is not a jail channel. You almost deleted ${jailChan}. Think about your actions, ${msg.author}.`);
        }
        else {
            await msg.channel.embed("Creating channel archive file, please wait...");
            let allMessages = await fetchAllMessages(2000);

            let html = "<head>\n  <style>\n    body {background-color: #36393f}\n  	.avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

            for (let m of allMessages) {
                if (m.content || m.attachments) {
                    let registered = false;
                    let mhtml = "<div>\n"
                    if (!m.member) m.member = {displayName: m.author.id + " (left server)"}
                    mhtml += `<img class="avatar" src="${m.author.displayAvatarURL}" align="left" height=40/><span class="username"><b>${m.member.displayName}</b></span>  <span class="timestamp">(${m.author.id})</span>\n`
                    mhtml += `<p display="inline" class="timestamp"> ${m.createdAt.toString().replace("Central Standard Time", m.createdTimestamp)} </p>\n`
                    if (m.content) {
                        mhtml += `<p class="textcontent">${fixEmojis(m.content)}</p>`;
                        registered = true;
                    }
                    if (m.attachments) {
                        let attachments = m.attachments.array();
                        for (let a of attachments) {
                            if (a.filename.endsWith("png" || a.filename.endsWith("gif") || a.filename.endsWith("jpg"))) {
                                let _file = await snekfetch.get(a.url);
                                let base64 = _file.body.toString('base64');
                                console.log(base64.substring(0, 100), "base64")
                                html += `\n<img src="data:image/jpeg;base64,${base64}"><br><br>`;
                                registered = true;
                            }
                        }
                    }
                    if (registered) html += mhtml + "\n</div><br>\n";
                }

            }
            console.log("creating attachment")
            let attachment = new Discord.Attachment(Buffer.from(html), `${msg.channel.name}.html`);
            
            // TODO: DM users chat log
            let permissions = msg.channel.permissionOverwrites.array();
            let members = [];
            for (let p of permissions) {
                if (p.type === "member") {
                    members.push(p.id);
                }
            }

            //Log file
            await msg.guild.channels.get(chans.jaillog).embed("Jail ended: " + members.map(_m => `<@${_m}>`));
            await msg.guild.channels.get(chans.jaillog).send(attachment);


            //DM users
            for (let memid of members) {
                try {
                    let mem = msg.guild.members.get(memid);
                    let dm = await mem.createDM();
                    await dm.embed("This is an archive of the jail chat. It is recommended you keep this for future reference.\n\nDownload it and open it with a browser.");
                    await dm.send(attachment);
                } catch(e) {
                    await msg.guild.channels.get(chans.jaillog).embed(`Unable to DM user with id ${memid} to send jail archive.`);
                }
            }
            
            await msg.channel.embed("This channel will be deleted. If this was a mistake, change the channel name to `NO`. You have 30 seconds.");
            
            await new Promise(next => setTimeout(next, 30 * 1000));
            
            if (msg.channel.name.toLowerCase() !== "no") {
                await msg.channel.embed("Removing users' jail status...");
                await new Promise(next => setTimeout(next, 3 * 1000));
                for (let memid of members) {
                    let mem = msg.guild.members.get(memid);
                    if (mem.roles.get("656918036053491780")) {
                        await mem.addRole("283272728084086784"); // Add DE
                        await mem.removeRole("656918036053491780"); // Remove Jail DE
                    }
                    await mem.removeRole(TO);
                    await mem.removeRole("574731157061632000"); // Remove hideallchannels
                }
                await msg.channel.embed("Removal completed. Deleting channel...");
                await new Promise(next => setTimeout(next, 5 * 1000));
                await msg.channel.delete();
            } else {
                await msg.channel.embed("You have chosen not to delete this channel. All users are still in jail.")
                await msg.channel.setName(`${members.map(m => msg.guild.members.get(m).displayName.replace(/[^A-z0-9]/g, "")).join("-")}-chilltown`)
            }

            function fixEmojis(text) {
                let regCapture = /<(a{0,1}):\w+:(\d{18})>/
                while (regCapture.test(text)) {
                    let results = regCapture.exec(text);
                    let ending = results[1] && results[1] === "a" ? "gif" : "png";
                    let id = results[2];
                    let newText = `<img src="https://cdn.discordapp.com/emojis/${id}.${ending}" height=20>`;
                    text = text.replace(regCapture, newText);
                }
                return text;
            }

            async function fetchAllMessages(limit = 500) {
                let messages = {};
                let lastMessage = null;

                fetcher:
                while (Object.keys(messages).length < limit) {
                    let options = { limit: 100 };
                    if (lastMessage) options.before = lastMessage;
                    console.log("Fetching...")
                    let msgs = (await msg.channel.fetchMessages(options)).array();
                    if (!msgs || !msgs[msgs.length - 1] || msgs[msgs.length - 1].id === lastMessage) break fetcher;
                    for (let m of msgs) {
                        messages[m.id] = m;
                    }
                    lastMessage = msgs[msgs.length - 1].id;
                    await new Promise(next => setTimeout(next, 5000));
                }
                let finalArray = [];
                for (let id in messages) {
                    finalArray.push(messages[id])
                }
                return finalArray.reverse();
            }
        }
    },
    info: {
        aliases: ["endjail", "unjail", "unball", "endball", "ballnomore"],
        example: "!endjail (in jail channel)",
        minarg: 0,
        description: "Deletes a jail channel",
        category: "Staff"
    }
};