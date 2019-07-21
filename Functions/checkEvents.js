module.exports = async function(guild, Discord) {
    const chans = Discord.chans;
    let chan = guild.channels.get(chans.events);

    setTimeout(async () => {
        console.log("Checking events...");
        await runCheck();
        console.log("Done checking events.");
    }, 5000);
    
    setInterval(async () => {
        console.log("Checking events...");
        await runCheck();
        console.log("Done checking events.");
    }, 60000);
    

    async function dmReminders(m, toSend) {
        let ids = await fetchAllUsers(m, "📅");
        for (let id of ids) {
            try {
                let mem = m.guild.members.get(id);
                if (!mem.user.bot) {
                    let dm = await mem.createDM();
                    await dm.embed(toSend);
                }
            } catch(e) {
                console.log(e);
                continue;
            }
        }
    }

    async function fetchAllUsers(msg, react) {
        return new Promise(async resolve => {
            let done = false;
            let count = 0;
            let cur = null;
            let allUsers = [];
            while (!done) {
                let reaction = msg.reactions.get(react);
                if (!reaction) done = true;
                else {
                    let usrs = await reaction.fetchUsers(100, cur === null ? {} : {after: cur});
                    let toAdd = usrs.array();
                    for (let usr of toAdd) {
                        if (allUsers.indexOf(usr.id) === -1) allUsers.push(usr.id);
                    }
                    if (toAdd.length === 0) done = true;
                    else cur = toAdd[toAdd.length - 1].id;
                }
            }
            resolve(allUsers);
        })
    }

    async function runCheck() {
        let msgs = (await chan.fetchMessages()).array();
        for (let m of msgs) {
            console.log(m.id, /MID/)
            try {
                if (m.author.id !== "470410168186699788" || !m.embeds || !m.embeds[0] || !m.embeds[0].footer || !m.embeds[0].footer.text) return;
                let time = m.embeds[0].footer.text.split("||")[0].trim();
                let d = new Date(parseInt(time));
                if (!d) return;
        
                let link = `https://discordapp.com/channels/${m.guild.id}/${m.channel.id}/${m.id}`

                if (time.endsWith("0")) { //24 hours
                    let _24hours = 1000 * 60 * 60 * 24;
                    if (Date.now() + _24hours > d.getTime())  {
                        dmReminders(m, `24 hours until the event: [**${m.embeds[0].title}**](${link})`);
                        let embed = new Discord.RichEmbed(m.embeds[0]);
                        let newTime = time.substring(0, time.length - 1) + "1";
                        embed.setFooter(newTime + " || " + m.embeds[0].footer.text.split("||")[1].trim());
                        m.edit(embed);
                    }
                } else if (time.endsWith("1")) { //1 hour
                    let _1hour = 1000 * 60 * 60;
                    console.log()
                    if (Date.now() + _1hour > d.getTime()) {
                        dmReminders(m, `1 hour until the event: [**${m.embeds[0].title}**](${link})`);
                        let embed = new Discord.RichEmbed(m.embeds[0]);
                        let newTime = time.substring(0, time.length - 1) + "2";
                        embed.setFooter(newTime + " || " + m.embeds[0].footer.text.split("||")[1].trim());
                        m.edit(embed);
                    }
                } else if (time.endsWith("2")) { //Starting
                    if (Date.now() > d.getTime()) {
                        dmReminders(m, `The event [**${m.embeds[0].title}**](${link}) is now starting!`);
                        let embed = new Discord.RichEmbed(m.embeds[0]);
                        let newTime = "Started";
                        embed.setFooter("Event started");
                        m.edit(embed);
                    }
                }
            } catch(e) {
                console.log(e);
                continue;
            }
        }
    }
}