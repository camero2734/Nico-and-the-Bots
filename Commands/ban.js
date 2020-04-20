module.exports = {
    execute: async function (msg) {
        let banMessage = msg.content.split(" ").slice(1).join(" ").replace(/<@!{0,1}\d+>/g, "").trim();

        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You cannot use this command!");

        if (!msg.mentions || !msg.mentions.members || !msg.mentions.members.first()) {
            if (/<@!{0,1}\d+>/.test(msg.content)) return msg.channel.embed("Error fetching the member. This means they were probably already banned or left the server.");
            else return msg.channel.embed("You must mention a user to ban!");
        }

        let mentionedMember;

        try {
            mentionedMember = msg.mentions.members.first();
            if (mentionedMember.highestRole.comparePositionTo(msg.member.highestRole) >= 0) {
                return msg.channel.embed("You cannot ban someone of equal or higher role!");
            }
            let dm = await mentionedMember.createDM();
            await dm.send(new Discord.RichEmbed({title: "You have been banned from the twenty one pilots discord."})
                .setColor("RANDOM")
                .addField("Reason", (banMessage === "") ? "No reason provided" : banMessage)
                .addField("Timestamp", (new Date()).toString())
            );
        } catch(e) {
            console.log(e);
            if (msg.mentions.users.first())
            return msg.channel.embed("Error fetching the member. This means they were probably already banned or left the server.");
        }

        try {
            mentionedMember.ban(`${msg.author.username} ${msg.author.id}`)
            await msg.channel.embed(`${mentionedMember.displayName} banned successfully`);
        } catch(e) {
            console.log(e);
            return msg.channel.embed("Unknown error occurred while trying to ban this member.")
        }

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
