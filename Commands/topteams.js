module.exports = {
    execute: async function(msg) {
        let finalTeams = [];
        let teams = await loadJsonFile('teams.json')
        
        let begin = (msg.args && msg.args[1] > 0 && !isNaN(msg.args[1])) ? -5 + msg.args[1] * 5 : 0

        for (let team of teams) {
            let captain = await sql.get(`SELECT * FROM scores WHERE userId="${team.captain}"`)
            let totalPoints =  (captain && captain.points) ? captain.points : 0;
            for (let member of team.team) {
                let memberRow = await sql.get(`SELECT * FROM scores WHERE userId="${member}"`)
                if (memberRow && memberRow.points) totalPoints+= memberRow.points
            }
            let average = Math.floor(totalPoints / (1 + team.team.length));
            let fullTeam = (msg.guild.members.get(team.captain)) ? ([msg.guild.members.get(team.captain).user.displayAvatarURL.split("?")[0] + "?width=30&height=30"]) : [];
            for (let member of team.team) if (msg.guild.members.get(member)) fullTeam.push(msg.guild.members.get(member).user.displayAvatarURL.split("?")[0] + "?width=30&height=30")
            finalTeams.push({name: team.name, points: (average+team.points), logo: team.logo, members: fullTeam})
        }

        finalTeams.sort(function(a,b) {return (a.points > b.points) ? 1 : ((b.points > a.points) ? -1 : 0);}).reverse()

        finalTeams = finalTeams.slice(begin,begin+5);
        let buffer = await require('./js/topteams.js')(finalTeams, begin)
        msg.channel.send({file: buffer})
        

    }
,
    info: {
        aliases: false,
        example: "!topteams (Page #)",
        minarg: 0,
        description: "Returns an image of the top teams and their members",
        category: "Teams",
    }
}