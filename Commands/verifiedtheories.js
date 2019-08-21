module.exports = {
    execute: function (msg) {
        return;
        let joindate = msg.member.joinedAt
        if (joindate < new Date("20 April 2018")) {
            msg.member.addRole('475388751711830066')
            msg.channel.send(`You have been approved for access to <#${chans.verifiedtheories}>!`)
        } else {
            msg.channel.send("`You are not eligible to join the verified theories channel. You must have joined before dmaorg started to access this channel. If you want to appeal, use the !appeal command to send a request to be manually approved.`")
        }

    },
    info: {
        aliases: false,
        example: "!verifiedtheories",
        minarg: 0,
        description: "Gives access to the verified theories channel, if eligible.",
        category: "Other",
    }
}