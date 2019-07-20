module.exports = {
    execute: async function (msg) {
        if (!canKick(msg)) return msg.channel.embed("You must be an Admin or Moderator to use this command");
        if (!msg.args[2] || isNaN(msg.args[msg.args.length - 1])) return msg.channel.embed("Invalid parameters")
        var time = Date.now() + (msg.args[2] * 1000 * 60)
        let guild = msg.guild;
        let member = msg.mentions.members.first();

        try {
            let uid = member.user.id;
            if (!member) return msg.channel.embed("```Proper command usage is !mute [@user] [# of minutes]```")
            if (member.hasPermission('BAN_MEMBERS')) return msg.channel.send("```You cannot mute another Admin or Moderator```")
            member.addRole(TO);
            member.removeRole('269660541738418176')
            msg.channel.send({ embed: new Discord.RichEmbed({ description: "```User has been muted for " + msg.args[2] + " minutes```" }) });
            await sql.run(`DELETE FROM timeout WHERE userId = "${uid}"`)
            await sql.run("INSERT INTO timeout (userid, time) VALUES (?, ?)", [uid, time]);
            
            if (fairlyused(msg)) {
                myFunctions.sendembed(msg, msg.guild.channels.get(chans.fairlylog), 'Fairly Local used command!', false, 12845311)
            } else {
                staffUsedCommand(msg, "Mute", "#1e90ff", {User_muted: member.toString(), amount: msg.args[2] + " minutes",time: (new Date()).toString()})
            }
        } catch(e) {
            console.log(e, /ERRORMUTE/)
        }
    },
    info: {
        aliases: ["mute","timeout","crate"],
        example: "!mute [@ user] [# of minutes]",
        minarg: 3,
        description: "Mutes a user",
        category: "Staff",
    }
}

/*

*/