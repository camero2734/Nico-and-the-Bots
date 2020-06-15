module.exports = {
    execute: async function (msg) {
        if (!msg.member.hasRole("330877657132564480")) return msg.channel.embed("You cannot use this command");
        let allChans = msg.guild.channels.array()
        let count = 1;
        let testSlow = await msg.guild.channels.get(chans.spoilerimages).getSlowmode()
        let enabled = (!isNaN(testSlow) && testSlow > 0)
        let m = await msg.channel.send(`\`${enabled ? "Disabling" : "Enabling"} raid mode...\``)
        for (let chan of allChans) {
            await new Promise(async next => {
                if (chan.type === 'text') {
                    let perms = await chan.permissionsFor("269660541738418176")
                    if (perms.has("SEND_MESSAGES") && perms.has("VIEW_CHANNEL")) {
                        m.edit(`\`${enabled ? "Disabling" : "Enabling"} raid mode in ` + chan.name +  "(" + count + ")" + "...`")
                        count++
                        await chan.setSlowmode(enabled ? 0 : 1);
                        setTimeout(() => {next()}, 1000)
                    } else next()
                } else next()
            })
        }
        msg.guild.channels.get(chans.spoilerimages).setSlowmode(enabled ? 0 : 30) //flip it!
    },
    info: {
        aliases: false,
        example: "!raidmode",
        minarg: 0,
        description: "Turns on slowmode for all channels, disables images in all channels",
        category: "Staff",
    }
}