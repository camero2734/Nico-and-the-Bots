module.exports = {
    execute: function (msg) {
        let timeArray = getTime(msg.removeCommand(msg.content))
        if (!timeArray && Number(msg.args[msg.args.length - 1]) && Number(msg.args[msg.args.length - 1]) > 1) timeArray = [0, msg.args[msg.args.length - 1], 0, 0, msg.args[msg.args.length - 1]]
        if (!timeArray) return msg.channel.embed("Invalid time! Use a comma before the time.\n\nExample: `!remind Give poot all my ingies, 2 hours 30 minutes`\n(Note the comma; it is required)")
        let d = timeArray[0]; let h = timeArray[1]; let m = timeArray[2]; let s = timeArray[3]; let inHours = timeArray[4]
        if (inHours > 43800) return msg.channel.embed("Max time allowed is 5 years")
        let reminderTime = Math.floor(Date.now() + (inHours * 3600000))
        let reminderDate = new Date(reminderTime)
        let remindText = msg.removeCommand(msg.content).split(",")[0]
        sql.run("INSERT INTO remind (time, userID, hour, txt) VALUES (?, ?, ?, ?)", [reminderTime, msg.author.id, reminderDate.getHours(), msg.content]);
        let embed = new Discord.RichEmbed({ title: "Reminder Created!" })
        embed.addField("Reminder:", remindText)
        let timeString = `${padStr(reminderDate.getHours())}:${padStr(reminderDate.getMinutes())}`
        let days = "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(',')
        let months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(',')
        let now_date = new Date()
        let today_normalized = new Date(now_date.getDate() + ' ' + months[now_date.getMonth()] + ' ' + now_date.getFullYear())
        let then_normalized = new Date(reminderDate.getDate() + ' ' + months[reminderDate.getMonth()] + ' ' + reminderDate.getFullYear())
        let dateString = get_dateString(then_normalized.getTime() - today_normalized.getTime())
        embed.addField("Time:", ((d != 0) ? `${d} days` : ``) + ((h != 0) ? ` ${h} hours` : ``) + ((m != 0) ? ` ${m} minutes` : ``) + ((s != 0) ? ` ${s} seconds` : ``) + ` [${dateString} at ${timeString} CT]`)
        embed.setColor("00FF00")
        msg.channel.send({ embed: embed })
        return;

        function get_dateString(ms) {
            if (ms === 86400000) return 'Tomorrow'
            if (ms === 0) return 'Today'
            return days[reminderDate.getDay()] + ', ' + reminderDate.getDate() + ' ' + months[reminderDate.getMonth()]
        }

        function getTime(string) {
            let days_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *d)", "gi")
            let hours_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *h)", "gi")
            let minutes_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *m)", "gi")
            let seconds_reg = new RegExp("(?<=,.*)[0-9]{1,}?(?= *s)", "gi")
            let d = string.match(days_reg) || ['0']
            let h = string.match(hours_reg) || ['0']
            let m = string.match(minutes_reg) || ['0']
            let s = string.match(seconds_reg) || ['0']
            if (d[0].toString() + h[0].toString() + m[0].toString() + s[0].toString() === '0000') return null
            if (Number(d[0]) < 0 || Number(h[0]) < 0 || Number(m[0]) < 0 || Number(s[0]) < 0) return null
            let hourNum = 24 * parseInt(d[0]) + parseInt(h[0]) + parseInt(m[0]) / 60 + parseInt(s[0]) / 3600
            return [d[0], h[0], m[0], s[0], hourNum]
        }
    },
    info: {
        aliases: ["remind","remindme","setreminder","rem"],
        example: "!remind eat cheetos, 2 hours 10 minutes {Comma is required}",
        minarg: 2,
        description: "The bot will DM you to remind you of something",
        category: "Basic",
    }
}