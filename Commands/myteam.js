module.exports = {
    execute: async function(msg){
        let teams = await loadJsonFile('teams.json');

        let finalTeams = [];
        for (let team of teams) {
            let captain = await sql.get(`SELECT * FROM scores WHERE userId="${team.captain}"`);
            let totalPoints =  (captain && captain.points) ? captain.points : 0;
            for (let member of team.team) {
                let memberRow = await sql.get(`SELECT * FROM scores WHERE userId="${member}"`);
                if (memberRow && memberRow.points) totalPoints+= memberRow.points;
            }
            let average = Math.floor(totalPoints / (1 + team.team.length));
            team.points = (average+team.points);
            finalTeams.push(team);
        }

        finalTeams.sort(function(a,b) {return (a.points > b.points) ? 1 : ((b.points > a.points) ? -1 : 0);}).reverse();

        let myTeam;
        let teamNum = -1;
        for (let i = 0; i < finalTeams.length; i++) {
            let team = finalTeams[i];
            if (team.captain === msg.author.id) {
                myTeam = team;
                teamNum = i + 1;
            }
            console.log(team);
            for (let member of team.team) {
                if (member === msg.author.id) {
                    myTeam = team;
                    teamNum = i + 1;
                }
            }
        }
        if (!myTeam) return msg.channel.embed("You are not on a team")
        let embed = new Discord.RichEmbed().setColor("RANDOM").setAuthor("#" + teamNum + ": " + myTeam.name, myTeam.logo);
        embed.addField("Captain", msg.guild.members.get(myTeam.captain) ? msg.guild.members.get(myTeam.captain).displayName + ` (<@${myTeam.captain}>)` : "UserLeftServer" )
        let memText = ""
        for (let member of myTeam.team) {
            memText += (msg.guild.members.get(member) ? msg.guild.members.get(member).displayName + ` (<@${member}>)` : "UserLeftServer") + '\n'
        }
        embed.addField("Members", memText)
        msg.channel.send(embed)
    },
    info: {
        aliases: false,
        example: "!myteam",
        minarg: 0,
        description: "Displays a list of your teammates",
        category: "Teams",
    }
}