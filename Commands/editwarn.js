module.exports = {
    execute: async function (msg) {
        try {
            if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.embed("You must be an Admin or Moderator to use this command")
            if (!msg.args || !msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return msg.channel.embed("Invalid input0")
    
            let mem = msg.mentions && msg.mentions.members ? msg.mentions.members.first() : null;
            let num = msg.args && msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] : 1;
            console.log("BEFORE")
            if (!mem || !num) {
                console.log("BAD")
                return msg.channel.embed("Invalid input1");
            }
            //GET WARN TO EDIT
            let rows = await sql.all(`SELECT * FROM warn WHERE userid = "${mem.user.id}" ORDER BY date DESC`);
            let chosenRow = rows && rows[num - 1] ? rows[num - 1] : null;
            if (chosenRow === null) return msg.channel.embed("Invalid input2");
            console.log("AFTERAFTER")
            //ASK FOR CHANGES
            let newWarn = await askQuestion("Please enter a new warn message. If you don't want to change it, just reply with 0\nCurrent: " + chosenRow.warning);
            let newSeverity = await askQuestion("Please enter a new severity (1-10). If you don't want to change it, just reply with 0\nCurrent: " + (chosenRow.severity ? chosenRow.severity : 5));
            
            //MAKE CHANGES
            if (newWarn === "0" && newSeverity === "0") return msg.channel.embed("You didn't change anything. That's ok, we're all indecisive sometimes.");
            if (newWarn !== "0") await sql.run(`UPDATE warn SET warning="${newWarn}" WHERE userid="${chosenRow.userid}" AND date="${chosenRow.date}"`);
            if (newSeverity !== "0") await sql.run(`UPDATE warn SET severity="${newSeverity}" WHERE userid="${chosenRow.userid}" AND date="${chosenRow.date}"`);
            
            msg.channel.embed("Updated warning!")
        } catch (e) {
            console.log(e)
        }
        


        async function askQuestion(question) {
            const filter = (m => m.author.id === msg.author.id);
            let m = await msg.channel.send(new Discord.RichEmbed().setColor("RANDOM").setDescription(question));
            return new Promise(resolve => {
                msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] }).then(collected => {
                    m.delete();
                    let answer = collected.first();
                    answer.delete();
                    resolve(answer.content);
                }).catch(collected => {
                    resolve("0");
                });
            })
        }
    },
    info: {
        aliases: false,
        example: "!editwarn [@ user] [Warn #]",
        minarg: 2,
        description: "Checks warnings for a user",
        category: "Staff",
    }
}