module.exports = {
    execute: async function (msg) {
        let banMessage = msg.content.split(" ").slice(1).join(" ").replace(/<@!{0,1}\d+>/g, "").trim();

        let memberToBan;

        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You cannot use this command!");

        // Is a member mentioned?
        if (msg.mentions?.members?.first()) {
            memberToBan = msg.mentions.members.first();
        }
        // Is a user mentioned?
        else if (msg.mentions?.users?.first()) {
            let user = msg.mentions.users.first();
            memberToBan = new Discord.GuildMember(msg.guild, { user });
        }
        // Is a user id mentioned?
        else if (msg.content.match(/\d{17,19}/)) {
            let userid = msg.content.match(/\d{17,19}/)?.[0];
            if (!userid) return msg.channel.embed("You must mention a user!");
            // Is the user still in the server?
            let possibleMember = msg.guild.member(userid);
            if (!possibleMember) {
                let user = new Discord.User(bot, { id: userid })
                possibleMember = new Discord.GuildMember(msg.guild, { user });
            }
            memberToBan = possibleMember;
        }
        // Else invalid ban message
        else return msg.channel.embed("You must mention a user!");

        // Ensure user isn't already banned
        try {
            let prevBan = await msg.guild.fetchBan(memberToBan.id);
            if (prevBan) {
                let embed = new Discord.RichEmbed();
                let banner = prevBan.reason?.match(/\d{17,19}$/)?.[0];
                if (banner) embed.addField("Banned by", `<@${banner}>`);
                embed.setDescription(`<@${memberToBan.id}> is already banned`);
                return msg.channel.send(embed);
            }
        } catch(e) {
            console.log(e, /ALREADY BAN ERROR/);
        }



        // Ensure mod isn't banning another mod (incl. themselves)
        if (memberToBan.hasOwnProperty("highestRole") && memberToBan.highestRole.comparePositionTo(msg.member.highestRole) >= 0) {
            return msg.channel.embed("You cannot ban someone of equal or higher role!");
        }

        // Try dm'ing ban reason
        try {
            let dm = await memberToBan.createDM();
            await dm.send(new Discord.RichEmbed()
                .setTitle("You have been banned from the twenty one pilots discord.")
                .setColor("RANDOM")
                .addField("Reason", (banMessage === "") ? "No reason provided" : banMessage)
                .addField("Timestamp", (new Date()).toString())
            );
        } catch(e) {
            console.log(e, /DM BAN ERROR/)
            await msg.channel.embed("Unable to DM member before banning");
        }

        // Ban member
        try {
            await memberToBan.ban(`${msg.author.username} ${msg.author.id}`);
            await msg.channel.embed(`${memberToBan.displayName ? memberToBan.displayName : `<@${memberToBan.id}> (${memberToBan.id})`} banned successfully`);
        } catch(e) {
            console.log(e, /BAN ERROR/);
            return msg.channel.embed("Unknown error occurred while trying to ban this member.");
        }

        staffUsedCommand(msg, "Ban", "#810b0b", {User_banned: memberToBan.toString(), time: (new Date()).toString()})
    },
    info: {
        aliases: false,
        example: "!ban [@ user]",
        minarg: 2,
        description: "Bans a user",
        category: "Staff",
    }
}
