module.exports = {
    execute: async function(msg) {
        let mins = parseInt(msg.args[1]);
        let time = Date.now() + mins * 60000;
        if (!mins || isNaN(mins) || mins > 10080 || mins <= 0) return msg.channel.embed("Time entered must be between 0 and 10080 minutes (one week)");
        if (msg.member.hasRole("330877657132564480")) return msg.channel.embed("Staff can't mute themselves. You have to endure the unending pain of this server.")
        
        msg.channel.send(new Discord.RichEmbed().setDescription(`Would you like to take a break for ${mins} minutes? You won't be able to talk until this ends.`).setFooter(new Date (time)));
        let response = await msg.channel.awaitMessage(msg.member, m => {return ((m.content.toLowerCase().indexOf("yes") !== -1 || m.content.toLowerCase().indexOf("no") !== -1) && m.author.id === msg.author.id)});
        if (response.content.toLowerCase().indexOf("yes") === -1) return msg.channel.embed(`Ok, you saved yourself from ${mins} minutes of pain.`)
        
        msg.member.addRole(TO);
        msg.member.removeRole('269660541738418176');

        msg.channel.embed("You muted yourself for " + mins + " minutes. If you want the timeout to end early... figure it out...");
        await sql.get(`DELETE FROM timeout WHERE userid = "${msg.author.id}" AND type = "self"`);
        sql.run("INSERT INTO timeout (userid, time, type) VALUES (?, ?, ?)", [msg.author.id, time, "self"]);
    },
    info: {
        aliases: ["break", "selftimeout","muteme"],
        example: "!break [# of minutes]",
        minarg: 2,
        description: "Mute yourself if you want to take a break! Max time is 24 hours.",
        category: "Other",
    }
}