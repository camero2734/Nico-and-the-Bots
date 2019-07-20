module.exports = function(msg, type, color, details) {
    const bot = msg.client;
    const Discord = require("discord.js");
    let userName = msg
    if (msg instanceof Discord.Message) userName = msg.member.displayName
    let embed = new Discord.RichEmbed({title: type + " command used by " + userName}).setColor(color)
    for (let detail in details) {
        embed.addField(detail, details[detail])
    }
    bot.guilds.get("269657133673349120").channels.get("488076541499277333").send({embed: embed})
}