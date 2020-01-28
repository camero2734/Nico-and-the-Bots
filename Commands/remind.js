module.exports = {
    execute: async function (msg) {
        let origMsg = await msg.channel.send(new Discord.RichEmbed({description: "Creating reminder..."}).setColor("GREEN"));
        await new Promise(next => setTimeout(next, 1000));

        let reminderDate = chrono.parseDate(msg.content);
        if (!reminderDate || reminderDate.getTime() - Date.now() < 0) {
            return await origMsg.edit(new Discord.RichEmbed({description: "Invalid remind time!"}).setColor("GREEN"))
        }
        // GET D H M S and inHours
        let { d, h, m, s, inHours } = getTime(reminderDate);
        //GET REMINDER TEXT
        let remindText = msg.removeCommand(msg.content);
        let newReminder = new Item(msg.author.id, msg.content, "Reminder", reminderDate.getTime());
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
        embed.addField("Time remaining:", ((d != 0) ? `${d} days` : ``) + ((h != 0) ? ` ${h} hours` : ``) + ((m != 0) ? ` ${m} minutes` : ``) + ((s != 0) ? ` ${s} seconds` : ``) + ` [${dateString} at ${timeString} CT]`);
        embed.setColor("00FF00");
        await origMsg.edit(embed);
        return;

        function get_dateString(ms) {
            if (ms === 86400000) return 'Tomorrow'
            if (ms === 0) return 'Today'
            return days[reminderDate.getDay()] + ', ' + reminderDate.getDate() + ' ' + months[reminderDate.getMonth()]
        }

        function getTime(date) {
            let time = date.getTime() - Date.now();

            if (time <= 0) {
                return null;
            }

            let d = Math.floor(time/(1000 * 60 * 60 * 24));
            time -= d * (1000 * 60 * 60 * 24);

            let h = Math.floor(time/(1000 * 60 * 60));
            time -= h * (1000 * 60 * 60);

            let m = Math.floor(time/(1000 * 60));
            time -= m * (1000 * 60);

            let s = Math.floor(time/(1000));
            time -= s * (1000);

            let hourNum = 24 * d + h + m / 60 + s / 3600;
            return { d, h, m, s, inHours: hourNum};
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
