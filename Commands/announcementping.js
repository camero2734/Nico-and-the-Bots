module.exports = {
    execute: async function(msg){
        if (!msg.member.roles.get("330877657132564480")) return;

        let announceRole = msg.guild.roles.get("357682068785856514")
        if (!announceRole.mentionable) {
            await announceRole.setMentionable(true)
            msg.channel.embed("Announcement ping turned on! Will auto turn off after 2 minutes.\n\n(You can also use this command again to turn it off before then)")
            await delay(1000 * 60 * 2)
            if (announceRole.mentionable) {
                await announceRole.setMentionable(false)
                msg.channel.embed("Announcement ping turned off automatically.")
            }
        } else {
            await announceRole.setMentionable(false)
            msg.channel.embed("Announcement ping turned off!")
        }

    },
    info: {
        aliases: ["announcementping","pingannouncement","pingannouncements","ap"],
        example: "!announcements",
        minarg: 0,
        description: "Turns on/off pings for #announcements",
        category: "Staff",
    }
}