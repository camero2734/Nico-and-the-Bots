module.exports = {
    execute: async function (msg) {
        let guild = msg.guild;
        if (!canKick(msg)) return msg.channel.embed("You must be an Admin or Moderator to use this command");
        if (!msg.mentions || !msg.mentions.members) return msg.channel.embed('`Proper command usage is !unmute @user`');
        let member = msg.mentions.members.first();
        if (!member || typeof member === 'undefined') return msg.channel.embed('`Proper command usage is !unmute @user`');
        await member.removeRole(TO);
        await member.addRole('269660541738418176'); //BANDITO ROLE
        await connection.getRepository(Item).createQueryBuilder().delete().where("type = :type", {type: "Timeout"}).andWhere("id = :id", {id: member.id}).execute();
        msg.channel.embed(member + " **is no longer muted!**");
        if (fairlyused(msg)) {
            myFunctions.sendembed(msg, msg.guild.channels.get(chans.fairlylog), 'Fairly Local used command!', false, 12845311);
        } else {
            staffUsedCommand(msg, "Unmute", "#50df17", {User_unmuted: member.toString(), time: (new Date()).toString()});
        }
    },
    info: {
        aliases: ["unmute","untimeout", "uncrate"],
        example: "!unmute [@ user]",
        minarg: 2,
        description: "Unmutes a user",
        category: "Staff",
    }
}