module.exports = {
    execute: async function(msg) {
        return;
        let rows = await sql.all(`SELECT * FROM timeout WHERE userid=${msg.author.id}`);
        if (rows.length === 0) return msg.channel.embed("You have no valid breaks (or timeouts) to remove. Please ask a staff member to remove your timeout if this is a mistake.");
        let hasOtherTimeouts = false;
        for (let row of rows) if (row.type !== "self") hasOtherTimeouts = true;
        if (hasOtherTimeouts) return msg.channel.embed("You appear to have timeouts that aren't breaks. Please ask a staff member to remove your timeout if this is a mistake.")
        sql.get(`DELETE FROM timeout WHERE userid = "${msg.author.id}" AND type = "self"`);
        let guild = bot.guilds.get("269657133673349120");
        guild.members.get(msg.author.id).removeRole(TO);
        guild.members.get(msg.author.id).addRole('269660541738418176');
        msg.channel.embed("You ended your break! CONGRATS!!")
    },
    info: {
        aliases: false,
        example: "!break [# of minutes]",
        minarg: 0,
        description: "Unmute yourself if you took a break",
        category: "Other",
    }
}