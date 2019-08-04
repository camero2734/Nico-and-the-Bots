module.exports = {
    execute: async function (msg) {
        if (!canKick(msg)) return msg.channel.embed("You must be an Admin or Moderator to use this command");
        let timeParameter = null;
        for (let arg of msg.args) if (!isNaN(arg)) timeParameter = arg;
        if (!timeParameter || timeParameter <= 0) return msg.channel.embed("Invalid parameters");
        var time = Date.now() + (timeParameter * 1000 * 60);
        let member = msg.mentions.members.first();

        try {
            if (!member) return msg.channel.embed("```Proper command usage is !mute [@user] [# of minutes]```");
            if (member.hasPermission("BAN_MEMBERS")) return msg.channel.embed("```You cannot mute another Admin or Moderator```");
            member.addRole(TO);
            member.removeRole("269660541738418176"); //BANDITOS ROLE
            msg.channel.send(new Discord.RichEmbed({ description: "```User has been muted for " + timeParameter + " minutes```" }));
            
            await connection.getRepository(Item).createQueryBuilder().delete().where("type = :type", { type: "Timeout" }).andWhere("id = :id", { id: member.id }).execute();
            let newTimeout = new Item(member.id, msg.author.id, "Timeout", time);
            await connection.manager.save(newTimeout);
            
            if (fairlyused(msg)) {
                myFunctions.sendembed(msg, msg.guild.channels.get(chans.fairlylog), "Fairly Local used command!", false, 12845311);
            } else {
                staffUsedCommand(msg, "Mute", "#1e90ff", { User_muted: member.toString(), amount: timeParameter + " minutes", time: (new Date()).toString() });
            }
        } catch(e) {
            console.log(e, /ERRORMUTE/);
        }
    },
    info: {
        aliases: ["mute", "timeout", "crate"],
        example: "!mute [@ user] [# of minutes]",
        minarg: 3,
        description: "Mutes a user",
        category: "Staff"
    }
};

/*

*/