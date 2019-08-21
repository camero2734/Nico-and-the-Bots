module.exports = {
    execute: async function (msg) {
        let banMessage = ""
        if (msg.args && msg.args[2]) {
            msg.args.shift()
            msg.args.shift()
            banMessage = msg.args.join(" ")
        }
        if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.send("You don't have permission to do this!")
        let guild = msg.guild
        if ((!msg.mentions) || (!msg.mentions.users) || (!msg.mentions.users.first())) return msg.channel.send("```Proper command usage is !ban @user```")
        let uid = msg.mentions.users.first()
        let RoleMember = guild.member(uid);
        if (RoleMember.highestRole.comparePositionTo(msg.member.highestRole) >= 0) {
            msg.channel.send("You don't have permission to do this!")
            return
        }
        let dmc = await RoleMember.createDM()
        await dmc.send(new Discord.RichEmbed({title: "You have been banned from the twenty one pilots discord."}).setColor("RANDOM").addField("Reason", (banMessage === "") ? "No reason provided" : banMessage).addField("Timestamp", (new Date()).toString()))
        RoleMember.ban(msg.author.username)
        staffUsedCommand(msg, "Ban", "#810b0b", {User_banned: RoleMember.toString(), time: (new Date()).toString()})
    },
    info: {
        aliases: false,
        example: "!ban [@ user]",
        minarg: 2,
        description: "Bans a user",
        category: "Staff",
    }
}