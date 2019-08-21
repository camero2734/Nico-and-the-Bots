module.exports = {
    execute: function (msg) {
        let rip = msg.content.toLowerCase()
        var albumRoles = [BF, VSL, RAB, ST, NPI, TRENCH]
        async function addRemove(member, role, array) {
            for (let i = 0; i < array.length; i++) {
                await new Promise(next => {
                    if (msg.member.roles.get(array[i])) member.removeRole(array[i]).then(() => setTimeout(() => {next()}, 1000))
                    else next()
                })
            }
            member.addRole(role)
        }
        var role = msg.removeCommand(rip).toLowerCase();
        var give; //role that will be given
        switch (role.substring(0, 4)) {
            case 'tren':
                give = TRENCH
                break;
            case 'blur':
            case 'bf':
                give = BF
                break;
            case 'vess':
            case 'vsl':
                give = VSL
                break;
            case 'regi':
            case 'rab':
                give = RAB
                break;
            case 'st':
            case 'self':
            case 's/t':
                give = ST
                break;
            case 'no p':
            case 'npi':
                give = NPI
                break;
            default:
                give = null
        }
        if (!give) return msg.channel.send('```Role not found!```')
        if (albumRoles.indexOf(give) !== -1) {
            addRemove(msg.member, give, albumRoles)
        }
        msg.channel.send({ embed: new Discord.RichEmbed({ description: '```You now have the ' + msg.guild.roles.get(give).name + ' role!```', color: msg.guild.roles.get(give).color }) })
    },
    info: {
        aliases: ["album","role"],
        example: "!role RAB",
        minarg: 2,
        description: "Assigns the user an album role [NPI, Self Titled, RAB, Vessel, Blurryface, Trench]",
        category: "Roles",
    }
}