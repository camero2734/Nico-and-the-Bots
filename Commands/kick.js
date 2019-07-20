module.exports = {
    execute: async function (msg) {
        let banMessage = ""
        if (msg.args && msg.args[2]) {
            msg.args.shift()
            msg.args.shift()
            banMessage = msg.args.join(" ")
        }
        if (!canKick(msg)) return msg.channel.send("You don't have permission to kick!")
        if ((!msg.mentions) || (!msg.mentions.users) || (!msg.mentions.users.first())) return msg.channel.send("```Proper command usage is !kick @user```")
        let guild = msg.guild
        let uid = msg.mentions.users.first()
        let RoleMember = guild.member(uid);
        if (RoleMember.highestRole.comparePositionTo(msg.member.highestRole) >= 0) {
            msg.channel.send("User is same or higher rank!")
            return
        }
        let dmc = await RoleMember.createDM()
        await dmc.send(new Discord.RichEmbed({title: "You have been kicked from the twenty one pilots discord."}).setColor("RANDOM").addField("Reason", (banMessage === "") ? "No reason provided" : banMessage).addField("Timestamp", (new Date()).toString()))
        RoleMember.kick(msg.author.username)
        if (fairlyused(msg)) {
            myFunctions.sendembed(msg, msg.guild.channels.get(chans.fairlylog), 'Fairly Local used command!', false, 12845311)
        } else {
            staffUsedCommand(msg, "Kick", "#a56a6a", {User_kicked: RoleMember.toString() , time: (new Date()).toString()})
        }
    },
    info: {
        aliases: false,
        example: "!kick [@ user]",
        minarg: 2,
        description: "Kicks a user",
        category: "Staff",
    }
}