module.exports = {
    execute: async function (msg) {
        //GET [DAYS, HOURS, MINS, SECS, TOTALHOURS]
        let timeObject = getTime(msg.removeCommand(msg.content));
        if (!timeObject && Number(msg.args[msg.args.length - 1]) && Number(msg.args[msg.args.length - 1]) > 1) timeObject = {d: 0, h: msg.args[msg.args.length - 1], m: 0, s: 0, inHours: msg.args[msg.args.length - 1]};
        if (!timeObject) return msg.channel.embed("Invalid time! Use a comma before the time.\n\nExample: `!remind Give poot all my ingies, 2 hours 30 minutes`\n(Note the comma; it is required)");
        let {d, h, m, s, inHours} = timeObject;

        //CHECK MAX TIME
        if (inHours > 43800) return msg.channel.embed("Max time allowed is 5 years");

        //GET REMINDER UNIX TIME
        let reminderTime = Math.floor(Date.now() + (inHours * 3600000));
        let reminderDate = new Date(reminderTime);
        //GET REMINDER TEXT
        let remindText = msg.removeCommand(msg.content).split(",")[0];
        let newReminder = new Item(msg.author.id, msg.content, "Reminder", reminderTime);
        //SAVE!!
        await connection.manager.save(newReminder);

        //CREATE EMBED
        let embed = new Discord.RichEmbed({ title: "Reminder Created!" });
        embed.addField("Reminder:", remindText);
        let timeString = `${padStr(reminderDate.getHours())}:${padStr(reminderDate.getMinutes())}`;
        let days = "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(',');
        let months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(',');
        let now_date = new Date();
        let today_normalized = new Date(now_date.getDate() + ' ' + months[now_date.getMonth()] + ' ' + now_date.getFullYear());
        let then_normalized = new Date(reminderDate.getDate() + ' ' + months[reminderDate.getMonth()] + ' ' + reminderDate.getFullYear());
        let dateString = get_dateString(then_normalized.getTime() - today_normalized.getTime());
        embed.addField("Time:", ((d != 0) ? `${d} days` : ``) + ((h != 0) ? ` ${h} hours` : ``) + ((m != 0) ? ` ${m} minutes` : ``) + ((s != 0) ? ` ${s} seconds` : ``) + ` [${dateString} at ${timeString} CT]`);
        embed.setColor("00FF00");
        await msg.channel.send(embed);
        return;

        function get_dateString(ms) {
            if (ms === 86400000) return 'Tomorrow'
            if (ms === 0) return 'Today'
            return days[reminderDate.getDay()] + ', ' + reminderDate.getDate() + ' ' + months[reminderDate.getMonth()]
        }

        function getTime(string) {
            let days_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *d)", "gi");
            let hours_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *h)", "gi");
            let minutes_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *m)", "gi");
            let seconds_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *s)", "gi");
            let d = string.match(days_reg) || ['0'];
            let h = string.match(hours_reg) || ['0'];
            let m = string.match(minutes_reg) || ['0'];
            let s = string.match(seconds_reg) || ['0'];
            if (d[0].toString() + h[0].toString() + m[0].toString() + s[0].toString() === '0000') return null;
            if (Number(d[0]) < 0 || Number(h[0]) < 0 || Number(m[0]) < 0 || Number(s[0]) < 0) return null;
            let hourNum = 24 * parseInt(d[0]) + parseInt(h[0]) + parseInt(m[0]) / 60 + parseInt(s[0]) / 3600;
            return {d: d[0], h: h[0], m: m[0], s: s[0], inHours: hourNum};
        }
    }
,
    info: {
        aliases: ["remind","remindme","setreminder","rem"],
        example: "!remind eat cheetos, 2 hours 10 minutes {Comma is required}",
        minarg: 2,
        description: "The bot will DM you to remind you of something",
        category: "Basic",
    }
}