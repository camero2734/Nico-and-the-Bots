module.exports = {
    execute: async function(msg) {
        let reminders = await connection.getRepository(Item).find( {id: msg.author.id, type: "Reminder"} );
        let userInput = msg.removeCommand(msg.content).toLowerCase();
        let alreadyFound = false;
        for (let rem of reminders) {
            if (!alreadyFound) {
                let time = rem.time.toString();
                let text = rem.title.toLowerCase();
                let text1 = removeCommand(text);
                let arr0 = text1.split(" ");
                let arr1 = text1.split(",");
                if (arr1.length === 1 || !isNaN(arr0[arr0.length-1])) {
                    let arr2 = text1.split(" ");
                    arr2.pop();
                    text = arr2.join(" ");
                } else {
                    arr1.pop();
                    text = arr1.join(",");
                }
                switch (userInput) {
                    case time: {
                        alreadyFound = true;
                        let m2 = await msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to delete the reminder that says `" + text + "`?"}).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL) });
                        const filter = (m => m.author.id === msg.author.id && (m.content.toLowerCase() === 'yes' || m.content.toLowerCase() === 'no'));
                        let collected = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] });
                        await m2.delete();
                        let answer = collected.first();
                        await answer.delete();
                        if (answer.content.toLowerCase() === "no" || answer.content === "") {
                            msg.channel.embed("Your reminder was not deleted.");
                        } else if (answer.content.toLowerCase() === "yes") {
                            await connection.manager.remove(rem);
                            msg.channel.embed("Deleted reminder with delete code `" + time + "` that had content `" + text + "`");
                        }
                        else return msg.channel.embed("Because you replied with something other than 'yes' or 'no', your reminder was not deleted.")
                        break;
                    }
                    
                    case text: {
                        alreadyFound = true;
                        let m2 = await msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to delete the reminder that says `" + text + "`?"}).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL) });
                        const filter = (m => m.author.id === msg.author.id && (m.content.toLowerCase() === 'yes' || m.content.toLowerCase() === 'no'));
                        let collected = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] });
                        await m2.delete();
                        let answer = collected.first();
                        await answer.delete();
                        if (answer.content.toLowerCase() === "no" || answer.content === "") {
                            msg.channel.embed("Your reminder was not deleted.");
                        } else if (answer.content.toLowerCase() === "yes") {
                            await connection.manager.remove(rem);
                            msg.channel.embed("Deleted reminder with content `" + text + "`");
                        }
                        else return msg.channel.embed("Because you replied with something other than 'yes' or 'no', your reminder was not deleted.");
                        break;
                    }   
                }
            }
        }
        if (!alreadyFound) msg.channel.embed("Could not find reminder to delete. Use !help removeremind for a how-to.");
    },
    info: {
        aliases: ["removeremind","removereminder","deleteremind","deletereminder"],
        example: "!removeremind [Reminder text OR delete code]",
        minarg: 2,
        description: "Removes a reminder (use !remindlist to get a list)",
        category: "Other",
    }
}