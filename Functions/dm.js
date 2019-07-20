module.exports = function (use, m, x) {
    const Discord = require("discord.js");
    var user = use.member.user //msg.member.user, user.member.user, etc.
    user.createDM().then(DMCHannel => {
        if (x && typeof x === 'string') {
            DMCHannel.send(m)
            DMCHannel.sendFile(x)
            return;
        } else if (x) {
            DMCHannel.send({ embed: new Discord.RichEmbed({ description: m }) })
        } else {
            DMCHannel.send(m)
        }
    })
}