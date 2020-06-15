module.exports = {
    execute: async function (msg) {
        try {
            if (!msg.member.roles.get('330877657132564480')) return msg.delete()
            let num = msg.args[1]
            let newGuild = await msg.guild.fetchMembers()
            let members = newGuild.members.array()
            let found = []
            let count = 0;
            for (let member of members) {
                count++
                var anonymous_name = ""
                for (let j = 0; j < member.user.id.length; j += 4) {
                    anonymous_name += (parseInt(member.user.id.charAt(j)) + 1).toString()
                }
                if (anonymous_name.length < 11) anonymous_name += parseInt(member.user.id.charAt(member.user.id.length - 1)).toString()
                if (anonymous_name.trim() === num.trim() || anonymous_name.startsWith(num) || num.startsWith(anonymous_name)) found.push(member.user.id)
            }
            msg.channel.send(`<@${found[0]}>` + " " + found.length)
        } catch (e) {
            console.log(e, /ERR/)
        }
        
        
    },
    info: {
        aliases: false,
        example: "!findventingnum",
        minarg: 2,
        description: "Does nothing",
        category: "Staff",
    }
}