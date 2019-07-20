module.exports = {
    execute: async function (msg) {
        //Teams monthly reset
        if (msg.author.id !== poot) return;
        try {
            let teamsJSON = await loadJsonFile('teams.json')
            let numOnTeam = 5;
            let winningTeams = await selectWinningTeam();
            if (!Array.isArray(winningTeams)) return console.log(winningTeams);
            let winningTeam = winningTeams[0];
            let mems = ""
            for (let id of winningTeam.members) {
                let member = msg.guild.members.get(id);
                if (!member) continue;
                mems+=`<@${id}> `;
                await member.addRole("503645677574684683");
                
                try {
                    let dm = await member.createDM();
                    await dm.send("Your team won this month's team competition! You got 2000 credits and a badge!\n\n*Note that the badge isn't yet implemented but will be soon*");
                } catch(e) {
                    console.log(e);
                }
                
                let cur = await sql.get(`SELECT * FROM daily WHERE userId="${id}"`)
                await sql.run(`UPDATE daily SET xp="${cur.xp + 2000}" WHERE userId="${id}"`)
            }
            
            await msg.guild.channels.get(chans.announcements).send(`**${winningTeam.name} won the team competition!** \n\nThe team members were: ${mems}. They each won 2000 credits and a badge.\n\n*The teams are currently being reset*`)
    
            let preRows = await sql.all(`SELECT * FROM scores ORDER BY points DESC LIMIT 100`)
            for (let row of preRows) {
                if (!msg.guild.members.get(row.userId)) await sql.run(`DELETE FROM scores WHERE userId="${row.userId}"`)
            }
            let noShuffle = await sql.all(`SELECT * FROM scores ORDER BY points DESC LIMIT 100`)
            let rows = await sql.all(`SELECT * FROM scores ORDER BY points DESC LIMIT 100`)
            shuffle(rows)
            let teams = [];
            for (let i = 0; i < rows.length; i++) {
                if (!teams[Math.floor(i / numOnTeam)]) teams[Math.floor(i / numOnTeam)] = []
                if (msg.guild.members.get(rows[i].userId)) teams[Math.floor(i / numOnTeam)].push(rows[i].userId)
            }
            let finalTeams = [];
            for (let team of teams) {
                let tfound = false
                let captain;
                for (let row of noShuffle) {
                    if (!tfound && team.indexOf(row.userId) !== -1) {
                        tfound = true
                        captain = row.userId;
                        team.splice(team.indexOf(captain), 1)
                    }
                    
                }
                finalTeams.push({captain: captain, team: team, points: 0, name: "", logo: "", voted: [], today: (new Date()).getDate()})
            }
            let embed = new Discord.RichEmbed().setColor("RANDOM")
            embed.setTitle("This month's teams:")
            for (let team of finalTeams) {
                let teamStr = ""
                for (let member of team.team) {
                    teamStr += '<@' + msg.guild.members.get(member).user.id + ">\n"
                }
                embed.addField("Team " + (finalTeams.indexOf(team)+1) + ":", '<@' + msg.guild.members.get(team.captain).user.id + ">\n" + teamStr)
            }
            teamsJSON = finalTeams
            writeJsonFile('teams.json', teamsJSON)
            for (let team of finalTeams) {
                for (let member of team.team) {
                    await new Promise(async next => {
                        console.log(member, /TEAMMEMBER/)
                        msg.guild.members.get(member).createDM().then(async (dm) => {
                            let teamNum = finalTeams.indexOf(team) + 1;
                            let teamStr = ""
                            for (let member2 of team.team) {
                                if (member !== member2) teamStr += '<@' + msg.guild.members.get(member2).user.id + ">\n"
                            }
                            dm.send(`Monthly teams have been added! You are now a member of Team ${teamNum}! Your Team Captain is <@${team.captain}>, and your fellow team members are:\n${teamStr}\n\nYour team captain will be choosing a team name and icon. If you have ideas, suggest it to them!`).then(setTimeout(() => {next()}, 2000)).catch(e => setTimeout(() => {next()}, 2000))
                        }).catch(e => setTimeout(() => {next()}, 2000))
                    })
                }
            }
    
            for (let team of finalTeams) {
                await new Promise(async next => {
                    let teamNum = finalTeams.indexOf(team) + 1;
                    let teamStr = ""
                    for (let member of team.team) {
                        teamStr += '<@' + msg.guild.members.get(member).user.id + ">\n"
                    }
                    console.log(team.captain, /TEAMCAPTAIN/)
                    msg.guild.members.get(team.captain).createDM().then((dm) => {
                        dm.send(`Monthly teams have been added! You are now the captain of Team ${teamNum}! Your team members are:\n${teamStr}\n\nYou will be choosing a team name and icon. To do this, simply say \`!setupteam\` in #commands for a guided process. Make sure to ask your team for ideas regarding the name and icon first!`).then(setTimeout(() => {next()}, 2000)).catch(e => setTimeout(() => {next()}, 2000))
                    })
                })
            }
    
            //Leaderboard Monthly reset
            sql.all(`SELECT * FROM scores ORDER BY points DESC`).then((rows) => {
                let winners = '__**This month\'s winners are:**__\n\n'
                let winnercount = 0
                for (let row of rows) {
                    let id = row['userId']
                    let member = msg.guild.members.get(id)
                    if (member && !member.roles.get('330877657132564480') && !member.roles.get('326558787169288203') && !member.roles.get('326558918107070465') && !member.roles.get('326558916219502595') && winnercount < 3) {
                        winnercount++
                        let winRoles = ['326558787169288203', '326558918107070465', '326558916219502595']
                        for (let role of winRoles) {
                            let membersofrole = msg.guild.roles.get(role).members.array()
                            for (let mem of membersofrole) { mem.removeRole(role) }
                        }
                        let roleToGive = winRoles[winnercount - 1]
                        winners += `**${winnercount}.** <@${id}>\n`
                        member.addRole(roleToGive)
                    }
                }
                msg.guild.channels.get(chans.announcements).send(winners + '\n**These users will receive special roles that they can recolor with `!color [hex code]`**\nWinners are chosen automatically based on XP earned by being active. The scores reset on the 21st day of every month!')
    
            })
            sql.run(`DELETE FROM scores WHERE points > 0`)
            return;
    
            async function selectWinningTeam() {
                let finalTeams = [];
                let teams = await loadJsonFile('teams.json')
    
                for (let team of teams) {
                    let captain = await sql.get(`SELECT * FROM scores WHERE userId="${team.captain}"`)
                    let totalPoints = (captain && captain.points) ? captain.points : 0;
                    for (let member of team.team) {
                        let memberRow = await sql.get(`SELECT * FROM scores WHERE userId="${member}"`)
                        if (memberRow && memberRow.points) totalPoints += memberRow.points
                    }
                    let average = Math.floor(totalPoints / (1 + team.team.length));
                    let fullTeam = (msg.guild.members.get(team.captain)) ? ([msg.guild.members.get(team.captain).user.id]) : [];
                    for (let member of team.team) if (msg.guild.members.get(member)) fullTeam.push(msg.guild.members.get(member).user.id);
                    finalTeams.push({ name: team.name, points: (average + team.points), members: fullTeam })
                }
                finalTeams.sort(function (a, b) { return (a.points > b.points) ? 1 : ((b.points > a.points) ? -1 : 0); }).reverse()
                return finalTeams
            }
        } catch(e) {
            console.log(e, /ERR/)
        }
        
    }
,
    info: {
        aliases: false,
        example: "!monthlyreset",
        minarg: 0,
        description: "resets the score boards",
        category: "Staff",
    }
}