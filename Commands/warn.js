module.exports = {
    execute: async function (msg) {
        if (!msg.member.hasPermission("BAN_MEMBERS")) return msg.channel.embed("You must be an Admin or Moderator to use this command");

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
        severity = Math.min(Math.max(parseInt(severity), 1), 10);
        console.log(member.id + "\n", warnMessage + "\n", severity);

        //SEND EMBED WITH INFO
        let embed = new Discord.RichEmbed().setColor("RANDOM");
        embed.setAuthor(member.displayName, member.user.displayAvatarURL);
        embed.setDescription(member.displayName + " has been warned for `" + warnMessage + "`.\n\nSeverity: " + severity);
        embed.setFooter("Edit warning with !editwarn");
        await msg.channel.send(embed);

        //DM WARNED USER
        let dm = await member.createDM();
        await dm.embed("You have been warned for `" + warnMessage + "` at " + msg.createdAt + ". Please improve your behavior or you may be removed from the server!");

        //INSERT WARNING TO DATABASE - Severity is stored in the last digit of the time
        let theTime = Date.now().toString().split("");
        theTime[theTime.length - 1] = (severity - 1).toString();
        theTime = parseInt(theTime.join(""));
        let warn = new Item(member.id, warnMessage, "Warning", theTime);
        await connection.manager.save(warn);
        staffUsedCommand(msg, "Warn", "#a4a516", { channel: msg.channel.toString(), User_warned: member.displayName, warning:warnMessage, severity_given: severity, time: (new Date()).toString() });        
    },
    info: {
        aliases: false,
        example: "!warn [@ user] [severity]",
        minarg: 3,
        description: "Warns a user",
        category: "Staff"
    }
};