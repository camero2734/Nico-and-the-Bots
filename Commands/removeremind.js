module.exports = {
    execute: async function(msg){
        let rows = await sql.all(`SELECT * FROM remind WHERE userID="${msg.author.id}"`)
        let userInput = msg.removeCommand(msg.content).toLowerCase()
        let alreadyFound = false;
        for (let row of rows) {
            if (!alreadyFound) {
                let time = row.time.toString()
                let text = row.txt.toLowerCase()
                let text1 = msg.removeCommand(text)
                let arr0 = text1.split(" ")
                let arr1 = text1.split(",")
                if (arr1.length === 1 || !isNaN(arr0[arr0.length-1])) {
                    let arr2 = text1.split(" ")
                    arr2.pop()
                    text = arr2.join(" ")
                } else {
                    arr1.pop()
                    text = arr1.join(",")
                }
                switch (userInput) {
                    case time: {
                        alreadyFound = true;
                        (async function() {
                            msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to delete the reminder that says `" + text + "`?"}).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL) }).then((m2) => {
                                const filter = (m => m.author.id === msg.author.id && (m.content.toLowerCase() === 'yes' || m.content.toLowerCase() === 'no'))
                                msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                                    .then(async collected => {
                                        m2.delete()
                                        let answer = collected.first()
                                        answer.delete()
                                        if (answer.content.toLowerCase() === "no" || answer.content === "") {
                                            msg.channel.embed("Your reminder was not deleted.")
                                        } else if (answer.content.toLowerCase() === "yes") {
                                            await sql.run(`DELETE FROM remind WHERE userID="${msg.author.id}" AND time=${time}`)
                                            msg.channel.embed("Deleted message with delete code `" + time + "` that had content `" + text + "`")
                                        }
                                        else return msg.channel.embed("Because you replied with something other than 'yes' or 'no', your reminder was not deleted.")
                                    })
                                    .catch(e => {
                                        return msg.channel.embed("Reminder deletion timed out or errored.")
                                    });
                            })
                            
                            
                        })()
                        break;
                    }
                    
                    case text: {
                        alreadyFound = true;
                        (async function() {
                            msg.channel.send({ embed: new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to delete the reminder that says `" + text + "`?"}).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL) }).then((m2) => {
                                const filter = (m => m.author.id === msg.author.id && (m.content.toLowerCase() === 'yes' || m.content.toLowerCase() === 'no'))
                                msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                                    .then(async collected => {
                                        m2.delete()
                                        let answer = collected.first()
                                        answer.delete()
                                        if (answer.content.toLowerCase() === "no" || answer.content === "") {
                                            msg.channel.embed("Your reminder was not deleted.")
                                        } else if (answer.content.toLowerCase() === "yes") {
                                            await sql.run(`DELETE FROM remind WHERE userID="${msg.author.id}" AND time = ${row.time}`)
                                            msg.channel.embed("Deleted message with content `" + text + "`")
                                        }
                                        else return msg.channel.embed("Because you replied with something other than 'yes' or 'no', your reminder was not deleted.")
                                    })
                                    .catch(e => {
                                        return msg.channel.embed("Reminder deletion timed out or errored.")
                                    });
                            })
                            
                            
                        })()
                        break;
                    }   
                }
            }
        }
        if (!alreadyFound) msg.channel.embed("Could not find reminder to delete. Use !help removeremind for a how-to.")
    },
    info: {
        aliases: ["removeremind","removereminder","deleteremind","deletereminder"],
        example: "!removeremind [Reminder text OR delete code]",
        minarg: 2,
        description: "Removes a reminder (use !remindlist to get a list)",
        category: "Other",
    }
}