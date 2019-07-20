module.exports = {
    execute: function (msg) {
        let args = msg.content.split(' ')
        if (args.length === 1) return sendInfo(msg.member)
        var all = false
        var found = false
        if (msg.content.indexOf('all') !== -1) {
            all = true
        }
        if (msg.mentions && msg.mentions.users) {
            let user = msg.mentions.users.first()
            msg.guild.fetchMember(user).then((member) => {
                return sendInfo(member)
            })

        }
        var string = msg.removeCommand(msg.content)
        var members = msg.guild.members.array()

        for (let i = 0; i < members.length; i++) {
            var member = members[i]
            if ((member.user.username.toLowerCase() === string.toLowerCase()) && ((!found) || (all))) {
                found = true
                sendInfo(members[i])
            }
        }
        function sendInfo(member) {
            sql.get(`SELECT * FROM daily WHERE userid="${member.id}"`).then((row) => {
                if (!row) {
                    sql.run("INSERT INTO daily (userId, xp, date, num) VALUES (?, ?, ?, ?)", [msg.author.id, 1, 1, 0]).then(() => {
                        sql.get(`SELECT * FROM daily WHERE userId ="${member.id}"`).then(row => {
                            continueplz(row)
                        })
                    })

                } else {
                    if (!row.num) {
                        row.num = 0;
                        sql.run(`UPDATE daily SET num = ${0} WHERE userId = ${member.id}`);
                        continueplz(row)
                    } else continueplz(row)
                }
            })

            function continueplz(row) {
                let dn = row.num
                var roles = member.roles.array()
                var rolestring = ""
                for (j = 0; j < roles.length; j++) {
                    rolestring += roles[j].name + ", "
                }
                var rolest = rolestring.slice(0, -2)


                let lastmessagetime = 'N/A'
                if (member.lastMessage) {
                    lastmessagetime = member.lastMessage.createdAt
                }
                rolest = rolest.substring(0, 230)
                let embed = new Discord.RichEmbed({ title: member.displayName })
                // embed.addField('__User Information__')
                let fieldstoadd = [{ name: 'Display name', value: member.displayName }, { name: 'User Id', value: member.user.id }, { name: 'Roles', value: rolest }, { name: 'Top Role Color', value: member.displayHexColor }, { name: 'Joined', value: member.joinedAt.toString() }, { name: 'Status', value: member.presence.status }, { name: 'Daily uses', value: dn }]
                for (let field of fieldstoadd) embed.addField(field.name, field.value)
                embed.setThumbnail(member.user.displayAvatarURL)
                embed.setColor(member.displayHexColor)
                msg.channel.send({ embed: embed, disableEveryone: true })

            }
        }
    },
    info: {
        aliases: false,
        example: "!roleinfo [@ user]",
        minarg: 0,
        description: "Displays information about a user",
        category: "Info",
    }
}