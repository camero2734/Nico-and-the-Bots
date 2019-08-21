module.exports = {
    execute: async function(msg) {
        try {
            let page = 0
            if (msg.args[1] && parseInt(msg.args[1]) > 0 && parseInt(msg.args[1]) / parseInt(msg.args[1]) === 1) {
                page = parseInt(msg.args[1]) - 1
            }
            let reminders = await connection.getRepository(Item).find( {id: msg.author.id, type: "Reminder"} );
            let parsedReminders = [];
            for (let rem of reminders) parsedReminders.push({text: rem.title, timeString: calculateTimeRemaining(new Date(rem.time)), time: rem.time});
            parsedReminders.sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);});
            let embed = new Discord.RichEmbed({title: "Your reminders"}).setColor("RANDOM");
    
            let parsedPages = [];
            for (let i = 0; i < parsedReminders.length; i++) {
                let pageNum = Math.floor(i/25);
                if (!parsedPages[pageNum]) parsedPages[pageNum] = [];
                parsedPages[pageNum].push(parsedReminders[i]);
            }
    
            if (!parsedPages[page]) return msg.channel.embed("You have **" + parsedPages.length + `** page${parsedPages.length === 1 ? "" : "s"} of reminders.`);
    
            for (let i = 0; i < parsedPages[page].length; i++) {
                    let reminder = parsedPages[page][i];
                    let text1 = removeCommand(reminder.text);
                    let arr0 = text1.split(" ");
                    let arr1 = text1.split(",");
                    if (arr1.length === 1 || !isNaN(arr0[arr0.length-1])) {
                        let arr2 = text1.split(" ");
                        arr2.pop();
                        let finalText = arr2.join(" ");
                        console.log(text1, /FINALTEXT/);
                        let header = (finalText === "" ? "No Text" : finalText);
                        let field = reminder.timeString + " (Delete code: " + reminder.time + ")";
                        embed.addField(header.substring(0,256), field.substring(0,256));
                    } else {
                        arr1.pop();
                        let finalText = arr1.join(",");
                        let header = (finalText === "" ? "No Text" : finalText);
                        let field = reminder.timeString + " (Delete code: " + reminder.time + ")";
                        embed.addField(header.substring(0,256), field.substring(0,256));
                    }
            }
            embed.setFooter("Page " + (page + 1), bot.user.displayAvatarURL);
            msg.channel.send({embed: embed});
    
            function calculateTimeRemaining(date) {
                let now = Date.now()
                let diff = date - now
                var delta = Math.abs(diff) / 1000;
                var days = Math.floor(delta / 86400).toString();
                delta -= days * 86400;
                var hours = (Math.floor(delta / 3600) % 24).toString();
                if (days === "0") {
                    delta -= hours * 3600
                    var minutes = (Math.floor(delta/60) % 60).toString();
                    if (hours === "0") {
                        delta -= minutes * 60
                        var seconds = (Math.floor(delta) % 60).toString();
                        return (minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"} and ` + seconds + ` second${parseInt(seconds) === 1 ? "" : "s"}`)
                    } else return (hours + ` hour${parseInt(hours) === 1 ? "" : "s"} and ` + minutes + ` minute${parseInt(minutes) === 1 ? "" : "s"}`)
                } else return (days + ` day${parseInt(days) === 1 ? "" : "s"} and ` + hours + ` hour${parseInt(hours) === 1 ? "" : "s"}`)
            }
        } catch(e) {
            console.log(e)
        }  
        
    },
    info: {
        aliases: ["remindlist","reminderlist","rlist","myreminders","reminders"],
        example: "!remindlist [page #]",
        minarg: 0,
        description: "Sends a list of your reminders",
        category: "Basic",
    }
}