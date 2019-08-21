module.exports = {
    execute: async function (msg) {
        if (msg.member.hasPermission("BAN_MEMBERS") && msg && msg.mentions && msg.mentions.members && msg.mentions.members.first()) {
            let overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;
            let member = msg.mentions.members.first();
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            sendWarns(member, page, overview, false);
        } else if (msg.member.hasPermission("BAN_MEMBERS") && !isNaN(msg.args[1])) {
            let overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;
            let member ={ id: msg.args[1] };
            if (msg.guild.members.get(member.id)) member = msg.guild.members.get(member.id);
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            sendWarns(member, page, overview, false);
        } else if (msg.member.hasPermission("BAN_MEMBERS") && msg.args[1]) {
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            let members = msg.guild.members.array();
            let matches = fuzzyMatch(members, removeCommand(msg.content), { key: "displayName" });
            if (matches.length > 0) sendWarns(matches[0], page, false, false);
            else return msg.channel.embed("No matches found!");
        } else {
            let member = msg.member;
            let page = msg.args[1] && !isNaN(msg.args[1]) ? msg.args[1] - 1 : 0;
            sendWarns(member, page, false, true);
        }
        
        async function sendWarns(member, page, overview, type) {
            let perpage = 5;
            let warnNum = 0;
            let lastWarn = 0;
            let userWarns = await connection.getRepository(Item).find({ id: member.id, type: "Warning" });
            let pagedWarns = userWarns.slice(page * perpage, page * perpage + perpage);
            if (pagedWarns.length === 0) {
                let pageCount = Math.ceil(userWarns.length/perpage);
                if (pageCount === 0) return msg.channel.embed("This user has no warnings.");
                else return msg.channel.embed("This page does not exist. The user has " + pageCount + " page(s).");
            }
            else warnNum = userWarns.length, lastWarn = userWarns[0].date;
            let embed = new Discord.RichEmbed();
            embed.setColor("RANDOM");
            if (member.displayName && member.user) embed.setAuthor(member.displayName, member.user.displayAvatarURL);
            embed.setFooter(bot.user.username, bot.user.displayAvatarURL);
            let severityArr = [0, 0];
            let i = 0;
            for (let warn of pagedWarns) {
                let date = new Date(warn.time);
                let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                let day = date.getDate() < 10 ? "0" + date.getDate().toString()  : date.getDate().toString();
                let severity = parseInt(warn.time.toString().split("").pop()) + 1;
                let title = (i + 1) + ". " + (warn.title ? warn.title.replace(/<@!{0,1}\d{18}>/g, "").substring(0, 240) + " [" + severity + "]" : "CORRUPTED_FIELD");
                let field = `Date: ${day + " " + months[date.getMonth()] + " " + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + " (CT)"}\n`;
                if (!overview) embed.addField(title, field);
                severityArr[0] += severity;
                severityArr[1]++;
                i++;
            }

            if (overview) {
                embed.addField("# of warns", warnNum);
                embed.addField("Last warn", new Date(lastWarn));
                embed.addField("Average Severity", severityArr[0]/severityArr[1]);
            } else {
                embed.setFooter("Average Severity: " + (severityArr[0]/severityArr[1]) + ", # of warns: " + warnNum, bot.user.displayAvatarURL);
            }
            if (type) {
                let dm = await member.createDM();
                await dm.send(embed);
            }
            else await msg.channel.send(embed);
        }

    },
    info: {
        aliases: ["chkwarn", "checkwarn", "cw", "chkwarns", "checkwarns", "warns", "overview"],
        example: "!chkwarn (@ user)",
        minarg: 0,
        description: "Checks warnings for yourself",
        category: "Info"
    }
};

/* OLD
if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("```You must be an Admin or Moderator to use this command```")

        if (!msg.args || !msg.args[1]) return this.embed(msg);
        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);

        let member = msg.mentions.members.first();
        
        ...all(`SELECT * FROM warn WHERE userid = "${member.id}" ORDER BY date DESC LIMIT 25`).then((rows) => {
            //var usrname = bot.users.get(row.userId).username
            let embed = new Discord.RichEmbed().setColor("RANDOM").setAuthor(member.displayName, member.user.displayAvatarURL).setFooter(bot.user.username, bot.user.displayAvatarURL);
            for (let row of rows) {
                let date = new Date(row.date)

                var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                let day = date.getDate() < 10 ? '0' + date.getDate().toString()  : date.getDate().toString()

                embed.addField(row.warning ? row.warning.replace(/<@!{0,1}\d{18}>/g, "").substring(0, 254) : "CORRUPTED_FIELD", `Date: ${day + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ' (CT)'}\n`)

            }
            msg.channel.send(embed);
        });
*/