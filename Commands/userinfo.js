module.exports = {
    execute: function (msg) {
        let args = msg.content.split(" ");
        if (args.length === 1) return sendInfo(msg.member);
        if (msg.mentions && msg.mentions.users) {
            let user = msg.mentions.users.first();
            msg.guild.fetchMember(user).then((member) => {
                return sendInfo(member);
            });
        }
        let string = msg.removeCommand(msg.content).toLowerCase();
        let members = msg.guild.members.array();

        for (let member of members) {
            if (member.user.username.toLowerCase() === string || member.displayName.toLowerCase() === string) {
                sendInfo(member);
                break;
            }
        }
        async function sendInfo(member) {
            let userEconomy = await connection.getRepository(Economy).findOne({ id: member.id });
            if (!userEconomy) userEconomy = new Economy({id: member.id});

            let roles = member.roles.array();
            let rolestring = "";
            for (j = 0; j < roles.length; j++) {
                rolestring += roles[j].name + ", ";
            }
            let rolest = rolestring.slice(0, -2).substring(0, 230);
            let embed = new Discord.RichEmbed({ title: member.displayName });
            let fieldstoadd = [{ name: "Display name", value: member.displayName }, { name: "User Id", value: member.user.id }, { name: "Roles", value: rolest }, { name: "Top Role Color", value: member.displayHexColor }, { name: "Joined", value: member.joinedAt.toString() }, { name: "Status", value: member.presence.status }, { name: "Daily uses", value: userEconomy.dailyCount }];
            for (let field of fieldstoadd) embed.addField(field.name, field.value);
            embed.setThumbnail(member.user.displayAvatarURL);
            embed.setColor(member.displayHexColor);
            msg.channel.send({ embed: embed, disableEveryone: true });
        }
    },
    info: {
        aliases: false,
        example: "!roleinfo [@ user]",
        minarg: 0,
        description: "Displays information about a user",
        category: "Info"
    }
};
