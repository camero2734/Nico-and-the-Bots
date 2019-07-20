module.exports = {
    execute: function (msg) {
        if ((!msg.member.roles.get("269660563368312833")) && (!msg.member.roles.get("323555864646647808")) && (!msg.member.roles.get("292831640470683658"))) return msg.channel.send("You must be an Admin or Moderator to use this command")
        var args = msg.content.split(' ');
        if ((!args[1]) || (args[1] / args[1] !== 1)) return msg.channel.send("```Proper command usage is !delete [number of messages to delete]```")
        message = parseInt(args[1]);
        msg.delete().then((msg) => {
            if (message === 1) {
                var todelete = msg.channel.lastMessageID
                var arra = msg.channel.messages.array()
                var td = arra[arra.length - 1]
                td.delete()
                msg.channel.send("```1 message has been deleted```")
                return;
            }
            msg.channel.bulkDelete(message).then((messages) => {
                let msgArr = messages.array()
                let sng = 'DELETED MESSAGES:\n(Deleted by: @' + msg.author.username + '#' + msg.author.discriminator + ' in #' + msg.channel.name + ')\n\n'
                for (let i = msgArr.length - 1; i >= 0; i--) {
                    sng += msgArr[i].createdAt + ' [' + msgArr[i].id + '] | @' + msgArr[i].author.username + '#' + msgArr[i].author.discriminator + ': ' + msgArr[i].content + '\n\n'
                }
                fs.writeFile('./bulk.doc', sng, (err) => {
                    if (err) throw err;
                    msg.guild.channels.get(chans.deletelog).sendFile('./bulk.doc', 'Bulk File at ' + Date.now() + '.doc')
                });
            })
            msg.channel.embed(message + " messages have been deleted")
            staffUsedCommand(msg, "Delete", "#3695ff", {channel: msg.channel.toString(), amount: message + " messages deleted",time: (new Date()).toString()})
        })
    },
    info: {
        aliases: false,
        example: "!delete [# of messages]",
        minarg: 2,
        description: "Deletes a number of messages from a channel",
        category: "Staff",
    }
}