import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { MessageEmbed } from "discord.js";
import { Connection } from "typeorm";
import * as chrono from "chrono-node";
import { MessageTools } from "helpers";
import { prefix } from "configuration/config";
import { Item } from "database/entities/Item";

export default new Command({
    name: "remind",
    description: "Creates a reminder that will be sent to your DMs",
    category: "Utility",
    usage: "!remind [Reminder text] on/in [Date/time]",
    example: "!remind Eat some flaming hot cheetos in 4 hours and 37 minutes",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        if (msg.argsString === "") throw new CommandError("You must provide a reminder");

        if (msg.argsString === "24") msg.content = `${prefix}${this.name} 24 hours`;
        const origMsg = await msg.channel.embed("Creating reminder...", "GREEN");
        await new Promise((next) => setTimeout(next, 1000));

        const reminderDate = chrono.parseDate(msg.argsString);
        console.log(reminderDate, /DATE/);
        if (!reminderDate || reminderDate.getTime() - Date.now() < 0) {
            await origMsg.edit(MessageTools.textEmbed("Invalid remind time!", "RED"));
            return;
        }
        // GET D H M S and inHours
        const theTime = getTime(reminderDate);
        if (!theTime) throw new Error("Invalid time");
        const { d, h, m, s } = theTime;

        //GET REMINDER TEXT
        const remindText = msg.argsString;
        const newReminder = new Item({
            id: msg.author.id,
            title: msg.content,
            type: "Reminder",
            time: reminderDate.getTime()
        });
        //SAVE!!
        await connection.manager.save(newReminder);
        //CREATE EMBED
        const embed = new MessageEmbed({ title: "Reminder Created!" });
        embed.addField("Reminder:", remindText);

        const hourString = reminderDate.getHours().toString().padStart(2, "0");
        const minuteString = reminderDate.getMinutes().toString().padStart(2, "0");
        const timeString = `${hourString}:${minuteString}`;

        const days = "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",");
        const months = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(",");
        const now_date = new Date();
        const today_normalized = new Date(
            now_date.getDate() + " " + months[now_date.getMonth()] + " " + now_date.getFullYear()
        );
        const then_normalized = new Date(
            reminderDate.getDate() + " " + months[reminderDate.getMonth()] + " " + reminderDate.getFullYear()
        );
        const dateString = get_dateString(then_normalized.getTime() - today_normalized.getTime());
        embed.addField(
            "Time remaining:",
            (d != 0 ? `${d} days` : ``) +
                (h != 0 ? ` ${h} hours` : ``) +
                (m != 0 ? ` ${m} minutes` : ``) +
                (s != 0 ? ` ${s} seconds` : ``) +
                ` [${dateString} at ${timeString} CT]`
        );
        embed.setColor("00FF00");
        await origMsg.edit(embed);
        return;
        function get_dateString(ms: number) {
            if (ms === 86400000) return "Tomorrow";
            if (ms === 0) return "Today";
            return days[reminderDate.getDay()] + ", " + reminderDate.getDate() + " " + months[reminderDate.getMonth()];
        }
        function getTime(date: Date) {
            let time = date.getTime() - Date.now();
            if (time <= 0) {
                return null;
            }
            const d = Math.floor(time / (1000 * 60 * 60 * 24));
            time -= d * (1000 * 60 * 60 * 24);
            const h = Math.floor(time / (1000 * 60 * 60));
            time -= h * (1000 * 60 * 60);
            const m = Math.floor(time / (1000 * 60));
            time -= m * (1000 * 60);
            const s = Math.floor(time / 1000);
            time -= s * 1000;
            const hourNum = 24 * d + h + m / 60 + s / 3600;
            return { d, h, m, s, inHours: hourNum };
        }
    }
});
