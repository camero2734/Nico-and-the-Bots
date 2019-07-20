module.exports = {
    execute: function (msg) {
        if (!msg.member.hasPermission('BAN_MEMBERS')) return msg.channel.embed("You must be an Admin or Moderator to use this command")

        if (!msg.args || !msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) return this.embed(msg);

        //GET INFO
        let member = msg.mentions.members.first();
        let warnMessage = removeCommand(removeCommand(msg.content));// !warn @user CONTENT
        let severity = 5;

        let severityArr = warnMessage.split(" "); 
        let pSev = severityArr[severityArr.length - 1].trim();
        if (!isNaN(pSev)) {
            severityArr.pop();
            warnMessage = severityArr.join(" ");
            severity = pSev;
        }

        console.log(member.id + "\n", warnMessage + "\n", severity);

        //SEND EMBED WITH INFO
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        embed.setAuthor(member.displayName, member.user.displayAvatarURL);
        embed.setDescription(member.displayName + " has been warned for `" + warnMessage + "`.\n\nSeverity: " + severity);
        embed.setFooter("Edit warning with !editwarn");
        msg.channel.send(embed);

        //DM WARNED USER
        member.createDM().then(DMCHannel => {
            DMCHannel.send('You have been warned for `' + warnMessage + '` at ' + msg.createdAt + '. Please improve your behavior or you may be kicked or banned from this server.')
        })

        //INSERT WARNING TO DATABASE
        sql.run("INSERT INTO warn (userid, warning, date, severity) VALUES (?, ?, ?, ?)", [member.id, warnMessage, new Date(), severity]);
        staffUsedCommand(msg, "Warn", "#a4a516", {channel: msg.channel.toString(), User_warned: member.displayName, warning:warnMessage, severity_given: severity,time: (new Date()).toString()})        

    },
    info: {
        aliases: false,
        example: "!warn [@ user] [severity]",
        minarg: 3,
        description: "Warns a user",
        category: "Staff",
    }
}