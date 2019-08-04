module.exports = {
    execute: async function (msg) {
        //Teams monthly reset
        if (msg.author.id !== poot) return;
        try {
            let teamsJSON = await loadJsonFile("teams.json");
            let numOnTeam = 5;
            let winningTeams = await selectWinningTeam();
            if (!Array.isArray(winningTeams)) return console.log(winningTeams);
            let winningTeam = winningTeams[0];
            let mems = "";
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
                let teamWinnerEconomy = await connection.getRepository(Economy).findOne({ id: id });
                teamWinnerEconomy.credits+=2000;
                await connection.manager.save(teamWinnerEconomy);
            }
            
            await msg.guild.channels.get(chans.announcements).send(`**${winningTeam.name} won the team competition!** \n\nThe team members were: ${mems}. They each won 2000 credits and a badge.\n\n*The teams are currently being reset*`);
    
            let allEconomies = await connection.getRepository(Economy).createQueryBuilder("e").orderBy("e.monthlyScore", "DESC").getMany();
            let teamEconomies = [];
            let t_i = 0;
            while (teamEconomies.length < 100 && t_i < allEconomies.length) {
                if (msg.guild.members.get(allEconomies[t_i].id)) teamEconomies.push(allEconomies[t_i]);
                t_i++;
            }
            //RANDOMIZE
            shuffle(teamEconomies);
            let teams = [];
            let index = 0;
            for (let i = 0; i < teamEconomies.length; i++) {
                if (teams[index] && teams[index].length >= numOnTeam) index++;
                if (!teams[index]) teams[index] = [];
                teams[index].push(teamEconomies[i]);
            }
            let finalTeams = [];
            for (let team of teams) {
                let sortedTeam = team.sort((a, b) => {return b.monthlyScore - a.monthlyScore;});
                let captain = sortedTeam.shift().id;
                team = sortedTeam.map(x => {return x.id;});
                finalTeams.push({ captain: captain, team: team, points: 0, name: "", logo: "", voted: [], today: (new Date()).getDate() });
            }
            let embed = new Discord.RichEmbed().setColor("RANDOM");
            embed.setTitle("This month's teams:");
            for (let team of finalTeams) {
                let teamStr = "";
                for (let member of team.team) {
                    teamStr += `<@${msg.guild.members.get(member).user.id}> ${msg.guild.members.get(member).displayName}\n`;
                }
                embed.addField("Team " + (finalTeams.indexOf(team)+1) + ":", `<@${msg.guild.members.get(team.captain).user.id}> ${msg.guild.members.get(team.captain).displayName}\n` + teamStr);
            }
            await msg.guild.channels.get(chans.announcements).send(embed);
            teamsJSON = finalTeams;
            await writeJsonFile("teams.json", teamsJSON);
            for (let team of finalTeams) {
                for (let member of team.team) {
                    await new Promise(async next => {
                        console.log(member, /TEAMMEMBER/);
                        msg.guild.members.get(member).createDM().then(async (dm) => {
                            let teamNum = finalTeams.indexOf(team) + 1;
                            let teamStr = "";
                            for (let member2 of team.team) {
                                if (member !== member2) teamStr += `<@ ${msg.guild.members.get(member2).user.id}> ${msg.guild.members.get(member2).displayName}\n`;
                            }
                            dm.send(`Monthly teams have been added! You are now a member of Team ${teamNum}! Your Team Captain is <@${team.captain}>, and your fellow team members are:\n${teamStr}\n\nYour team captain will be choosing a team name and icon. If you have ideas, suggest it to them!`).then(setTimeout(() => {next();}, 2000)).catch(e => setTimeout(() => {next();}, 2000));
                        }).catch(e => setTimeout(() => {next();}, 2000));
                    });
                }
            }
    
            for (let team of finalTeams) {
                await new Promise(async next => {
                    let teamNum = finalTeams.indexOf(team) + 1;
                    let teamStr = "";
                    for (let member of team.team) {
                        teamStr += `<@${msg.guild.members.get(member).user.id}> ${msg.guild.members.get(member).displayName}\n`;
                    }
                    console.log(team.captain, /TEAMCAPTAIN/);
                    msg.guild.members.get(team.captain).createDM().then((dm) => {
                        dm.send(`Monthly teams have been added! You are now the captain of Team ${teamNum}! Your team members are:\n${teamStr}\n\nYou will be choosing a team name and icon. To do this, simply say \`!setupteam\` in #commands for a guided process. Make sure to ask your team for ideas regarding the name and icon first!`).then(setTimeout(() => {next();}, 2000)).catch(e => setTimeout(() => {next();}, 2000));
                    });
                });
            }
    
            //Leaderboard Monthly reset
            let winners = "__**This month's winners are:**__\n\n";
            let winnercount = 0;
            for (let econ of allEconomies) {
                let id = econ.id;
                let member = msg.guild.members.get(id);
                econ.monthlyScore = 0;
                econ.monthlyLevel = 0;
                if (member && !member.roles.get("330877657132564480") && !member.roles.get("326558787169288203") && !member.roles.get("326558918107070465") && !member.roles.get("326558916219502595") && winnercount < 3) {
                    winnercount++;
                    let winRoles = ["326558787169288203", "326558918107070465", "326558916219502595"];
                    for (let role of winRoles) {
                        let membersofrole = msg.guild.roles.get(role).members.array();
                        for (let mem of membersofrole) { mem.removeRole(role); }
                    }
                    let roleToGive = winRoles[winnercount - 1];
                    winners += `**${winnercount}.** <@${id}>\n`;
                    await member.addRole(roleToGive);
                }
            }
            await msg.guild.channels.get(chans.announcements).send(winners + "\n**These users will receive special roles that they can recolor with `!color [hex code]`**\nWinners are chosen automatically based on the previous monthly scores earned by being active. The scores reset on the 21st day of every month!");
            
            //Save monthly scores being reset - can only save up to 999 at a time (SQLITE_LIMIT_VARIABLE_NUMBER)
            for (let i = 0; i < allEconomies.length; i+=999) {
                await connection.manager.save(allEconomies.slice(i, i+999));
            }

            return;
    
            async function selectWinningTeam() {
                let finalTeams = [];
                let teams = await loadJsonFile("teams.json");
    
                for (let team of teams) {
                    let captain = await connection.getRepository(Economy).findOne({ id: team.captain });
                    if (!captain) captain = new Economy(team.captain);
                    let totalPoints = captain.monthlyScore;
                    for (let member of team.team) {
                        let memberRow = await connection.getRepository(Economy).findOne({ id: member });
                        if (!memberRow) memberRow = new Economy(team.captain);
                        totalPoints += memberRow.monthlyScore;
                    }
                    let average = Math.floor(totalPoints / (1 + team.team.length));
                    let fullTeam = (msg.guild.members.get(team.captain)) ? ([msg.guild.members.get(team.captain).user.id]) : [];
                    for (let member of team.team) if (msg.guild.members.get(member)) fullTeam.push(msg.guild.members.get(member).user.id);
                    finalTeams.push({ name: team.name, points: (average + team.points), members: fullTeam });
                }
                finalTeams.sort(function (a, b) { return (a.points > b.points) ? 1 : ((b.points > a.points) ? -1 : 0); }).reverse();
                return finalTeams;
            }
        } catch(e) {
            msg.channel.embed("Error in monthly reset");
            console.log(e, /ERR/);
        }
        
    }
    ,
    info: {
        aliases: false,
        example: "!monthlyreset",
        minarg: 0,
        description: "resets the score boards",
        category: "Staff"
    }
};