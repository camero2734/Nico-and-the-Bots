module.exports = {
    execute: function (msg) {
        if (!canKick(msg)) return msg.channel.send("You must be an Admin or Moderator to use this command")
        let guild = msg.guild
        if (!msg.mentions || !msg.mentions.users) return msg.channel.send('`Proper command usage is !unmute @user`')
        let uid = msg.mentions.users.first()
        let RoleMember = guild.member(uid);
        if (!RoleMember || typeof RoleMember === 'undefined') return msg.channel.send('`Proper command usage is !unmute @user`')
        RoleMember.removeRole(TO)
        RoleMember.addRole('269660541738418176')
        sql.get(`DELETE FROM timeout WHERE userid = "${RoleMember.user.id}"`);
        msg.channel.embed(RoleMember + "**, you are no longer muted!**")
        if (fairlyused(msg)) {
            myFunctions.sendembed(msg, msg.guild.channels.get(chans.fairlylog), 'Fairly Local used command!', false, 12845311)
        } else {
            staffUsedCommand(msg, "Unmute", "#50df17", {User_unmuted: RoleMember.toString(),time: (new Date()).toString()})
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