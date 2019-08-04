module.exports = {
    execute: async function (msg) {
        try {
            if (!msg.member.hasPermission("BAN_MEMBERS")) return msg.channel.embed("You must be an Admin or Moderator to use this command");
            if (!msg.args || !msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return msg.channel.embed("Invalid input!");
            
            let mem = msg.mentions && msg.mentions.members ? msg.mentions.members.first() : null;
            let num = msg.args && msg.args[2] && !isNaN(msg.args[2]) ? msg.args[2] : 1;
            if (!mem || !num) {
                return msg.channel.embed("Invalid input!!");
            }

            //GET WARN TO EDIT
            let rows = await connection.getRepository(Item).find({ id: mem.id, type: "Warning" });
            let chosenRow = rows && rows[num - 1] ? rows[num - 1] : null;
            if (chosenRow === null) return msg.channel.embed("Invalid warn number given. Use `!chkwarn`.");
            let severity = parseInt(chosenRow.time.toString().split("").pop()) + 1;
            //ASK FOR CHANGES
            let newWarn = await askQuestion("Please enter a new warn message. If you don't want to change it, just reply with 0\nCurrent: " + chosenRow.title);
            let newSeverity = await askQuestion("Please enter a new severity (1-10). If you don't want to change it, just reply with 0\nCurrent: " + severity);
            
            //MAKE CHANGES
            if (newWarn === "0" && newSeverity === "0") return msg.channel.embed("You didn't change anything. That's ok, we're all indecisive sometimes.");
            if (newWarn !== "0") {
                chosenRow.title = newWarn;
            }
            if (newSeverity !== "0") {
                let theTime = chosenRow.time.toString().split("");
                theTime[theTime.length - 1] = (parseInt(newSeverity) - 1).toString();
                theTime = parseInt(theTime.join(""));
                chosenRow.time = theTime;
            }
            await connection.manager.save(chosenRow);
            await msg.channel.embed("Updated warning!");
        } catch (e) {
            console.log(e);
            msg.channel.embed("Error in editing warning");
        }
        


        async function askQuestion(question) {
            const filter = (m => m.author.id === msg.author.id);
            let m = await msg.channel.send(new Discord.RichEmbed().setColor("RANDOM").setDescription(question));
            return new Promise(resolve => {
                msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ["time"] }).then(collected => {
                    m.delete();
                    let answer = collected.first();
                    answer.delete();
                    resolve(answer.content);
                }).catch(collected => {
                    resolve("0");
                });
            });
        }
    },
    info: {
        aliases: false,
        example: "!editwarn [@ user] [Warn #]",
        minarg: 2,
        description: "Checks warnings for a user",
        category: "Staff"
    }
};