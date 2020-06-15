module.exports = {
    execute: async function(msg){
        class AsyncMessageCollector extends Discord.MessageCollector {
            constructor(channel, filter, options = {}) {
                super(channel, filter, options);
            }
            async _handle(...args) {
                const collect = this.handle(...args);
                const filter = await this.filter(...args, this.collected);
                if (!collect || !filter) return;
                this.collected.set(collect.key, collect.value);
                this.emit('collect', collect.value, this);
                const post = this.postCheck(...args);
                if (post) this.stop(post);
            }
        }
        
        let teams = await loadJsonFile('json/teams.json')
        let team;
        let captain;
        for (let t of teams) {
            if (t.captain === msg.author.id) team = t
            else if (t.team.indexOf(msg.author.id) !== -1) {captain = t.captain; team = t;}
        }
        if (!team && msg.author.id !== poot) return msg.channel.embed("You are not a team captain. Please contact your captain, <@" + captain + ">, and get them to set up your team!")
        else if (team.name !== "" && team.logo !== "") {
            if ((new Date()).getDate() !== team.today ) return msg.channel.embed("You already set up your team name and logo!")
            else msg.channel.embed("Your team name is already set to `" + team.name + "` and your logo is " + team.logo + ". If you do not want to change it, simply do not respond to the following prompts.")
        }
        async function askQuestions() {
            return new Promise(resolve => {
                msg.channel.send(new Discord.RichEmbed({ description: "Please enter the name you want your team to have. Note that it must be less than 25 characters" }).setColor("RANDOM")).then((m) => {
                    const filter = (m => {
                        if (m.author.bot) return false
                        if (m.author.id !== msg.author.id) return false
                        let returnFalse = false
                        if (m.content.length > 25) returnFalse = true, msg.channel.embed("Please enter a different name. It must be less than 25.")
                        for (let t of teams) {
                            if (t.name === m.content) returnFalse = true, msg.channel.embed("Please enter a different name. The name chosen matches another team's name.")
                        }
                        if (returnFalse) return false
                        else return true
                    })
                    
                    msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] })
                        .then(async collected => {
                            m.delete()
                            let answer = collected.first()
                            answer.delete()
                            const filter2 = (async m => {
                                return new Promise(resolveP => {
                                    if (m.channel.id !== msg.channel.id) resolveP(false)
                                    else if (m.author.bot) resolveP(false)
                                    else if (m.author.id !== msg.author.id) resolveP(false)
                                    else if ((!m.content.startsWith('http')) || (!m.content.endsWith(".png") && !m.content.endsWith(".jpg"))) { msg.channel.embed("Please send an image URL that ends with png or jpg"); resolveP(false) }
                                    else {
                                        snekfetch.get(m.content).then((r) => {
                                            if (r) resolveP(true)
                                            else {
                                                msg.channel.embed("This image seems to be invalid."); 
                                                resolveP(false)
                                            }
                                        }).catch(e => {
                                            msg.channel.embed("This image seems to be invalid."); 
                                            resolveP(false)
                                        })
                                    }
                                })
                                
                            })
                            let m2 = await msg.channel.send(new Discord.RichEmbed({ description: "Please enter the **direct URL** to the logo you want your team to have. Note that the logo should be square." }).setColor("RANDOM"))

                            const collector = new AsyncMessageCollector(msg.channel, filter2, { max: 1, time: 60000, errors: ['time'] })
                            collector.on('collect', async answer2 => {
                                m2.delete()
                                answer2.delete()
                                resolve({ name: answer.content, logo: answer2.content })
                            })
                            collector.on('end', async response => {
                                m2.delete()
                                let answer2 = response.first()
                                if (!answer2) resolve()
                                else {
                                    answer2.delete()
                                    resolve({ name: answer.content, logo: answer2.content })
                                }
                            })
                        })
                        .catch(e => {
                            console.log(e)
                            resolve()
                        });
                })
            })
        }
        askQuestions().then(async (stuff) => {
            if (!stuff || !stuff.name || !stuff.logo) return msg.channel.embed("There was an error or you waited too long. Please use `!setupteam` again to restart.")
            let name = stuff.name
            let logo = stuff.logo
            
            teams[teams.indexOf(team)].name = name
            teams[teams.indexOf(team)].logo = logo
            writeJsonFile('json/teams.json', teams)
            msg.channel.embed("You set your team name to `" + name + "` and your logo to " + logo + "\n\nIf this was incorrect, you can still fix it until midnight tonight (CT).")
        })

    }
,
    info: {
        aliases: false,
        example: "!setupteam",
        minarg: 0,
        description: "Sets your team name and icon. Can only be done once by the team captain.",
        category: "Teams",
    }
}