module.exports = {
    execute: async function(msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus")
        let teams = await loadJsonFile("json/teams.json")
        let preT = msg.removeCommand(msg.content).split(" ")
        let amount = preT.pop()
        let teamName = preT.join(" ")
        let recipientTeam;
        for (let team of teams) {
            if (team.name.toLowerCase() === teamName.toLowerCase()) recipientTeam = teams.indexOf(team)
        }
        if (!recipientTeam) return msg.channel.embed("The team name provided is invalid. Please use `!topteams` for a list of teams and its members")
        else {
            msg.channel.embed(JSON.stringify(teams[recipientTeam]))
            teams[recipientTeam].points+=parseInt(amount)
            await writeJsonFile('json/teams.json', teams)
            console.log(teams[recipientTeam].captain, /AWARDCAPTAIN/)
            let dmCap = await msg.guild.members.get(teams[recipientTeam].captain).createDM()
            await dmCap.send(new Discord.RichEmbed({description: "Your team has been awarded " + amount + " points!"}))
            for (let member of teams[recipientTeam].team) {
                await new Promise(next => {
                    console.log(member, /AWARDMEMBER/)
                    msg.guild.members.get(member).createDM().then((dm) => {
                        dm.send(new Discord.RichEmbed({description: "Your team has been awarded " + amount + " points!"})).then(() => {setTimeout(() => {next()}, 3000)})
                    })
                })
            }
        }
        
    },
    info: {
        aliases: false,
        example: "!awardteam [Team name] [amount]",
        minarg: 2,
        description: "Gives a team points",
        category: "Staff",
    }
}