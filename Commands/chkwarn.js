module.exports = {
    execute: async function (msg) {
        if (msg.member.hasPermission('BAN_MEMBERS') && msg && msg.mentions && msg.mentions.members && msg.mentions.members.first()) {
            let overview = msg.content.toLowerCase().indexOf("overview") !== -1 ? true : false;
            let member = msg.mentions.members.first();
            let page = msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] - 1 : 0;
            sendWarns(member, page, overview, false);
        } else {
            let member = msg.member;
            let page = msg.args[1] && !isNaN(msg.args[1]) ? msg.args[1] - 1 : 0;
            sendWarns(member, page, false, true);
        }
        
        async function sendWarns(member, page, overview, type) {
            let perpage = 5;
            let warnNum = 0; 
            let lastWarn = 0; 
            let rows = await sql.all(`SELECT * FROM warn WHERE userid = "${member.id}" ORDER BY date DESC`);
            if (!rows[page * perpage]) return msg.channel.embed("This page does not exist. The user has " + Math.ceil(rows.length/perpage) + " page(s).");
            if (!rows || rows.length == 0) return msg.channel.embed("This user has no warnings.");
            else warnNum = rows.length, lastWarn = rows[0].date;
            let embed = new Discord.RichEmbed();
            embed.setColor("RANDOM");
            embed.setAuthor(member.displayName, member.user.displayAvatarURL);
            embed.setFooter(bot.user.username, bot.user.displayAvatarURL);
            let severity = [0, 0];
            for (let i = page * perpage; i < page * perpage + perpage; i++) {
                let row = rows[i];
                if (!row) continue;
                let date = new Date(row.date);
                var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                let day = date.getDate() < 10 ? '0' + date.getDate().toString()  : date.getDate().toString();
                severity[0] += row.severity ? row.severity : 5;
                severity[1]++;
                if (!overview) embed.addField((i+1) + ". " + (row.warning ? row.warning.replace(/<@!{0,1}\d{18}>/g, "").substring(0, 240) + " [" + (row.severity ? row.severity : 5) + "]" : "CORRUPTED_FIELD"), `Date: ${day + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ' (CT)'}\n`)
            }
            console.log("4")
            if (overview) {
                embed.addField("# of warns", warnNum);
                embed.addField("Last warn", new Date(lastWarn));
                embed.addField("Average Severity", severity[0]/severity[1]);
            } else {
                embed.setFooter("Average Severity: " + (severity[0]/severity[1]) + ", # of warns: " + warnNum, bot.user.displayAvatarURL)
            }
            if (type) {
                let dm = await member.createDM();
                dm.send(embed);
            }
            else msg.channel.send(embed);
        }

    },
    info: {
        aliases: ["chkwarn", "checkwarn", "cw", "chkwarns", "checkwarns", "warns", "overview"],
        example: "!chkwarn (@ user)",
        minarg: 0,
        description: "Checks warnings for yourself",
        category: "Info",
    }
}

/* OLD
if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("```You must be an Admin or Moderator to use this command```")

        if (!msg.args || !msg.args[1]) return this.embed(msg);
        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);

        let member = msg.mentions.members.first();
        
        sql.all(`SELECT * FROM warn WHERE userid = "${member.id}" ORDER BY date DESC LIMIT 25`).then((rows) => {
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