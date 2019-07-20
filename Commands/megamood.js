module.exports = {
    execute: function (msg) {
        if (msg.author.id === poot) msg.delete()
        msg.channel.send("<:emofish_01:476211949533790208><:emofish_02:476211950116929546><:emofish_03:476211950414462996>\n<:emofish_04:476211951588999189><:emofish_05:476211953128308756><:emofish_06:476211953044553729>\n<:emofish_07:476211953975427072><:emofish_08:476211954399313920><:emofish_09:476211954743246858> " + msg.removeCommand(msg.content))
    },
    info: {
        aliases: false,
        example: "!megamood",
        minarg: 0,
        description: "Sends megamofish",
        category: "Fun",
    }
}