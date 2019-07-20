module.exports = {
    execute: async function (msg) {
        return msg.channel.embed("No");
        // if (msg.member.roles.get("562818597387239434")) return msg.channel.embed("You cannot do this more than once.");
        // else await msg.member.addRole("562818597387239434");


        // let roles = chans.songroles;
        // let count = 0;

        // let row = await sql.get(`SELECT * FROM songroles WHERE id="${msg.author.id}"`);
        // let hasRoles = row.data.split(",");

        // for (let role of roles) {
        //     if (hasRoles.indexOf(role) !== -1) count++;
        // }
        // let refund = count * 3000;
        
        // try {
        //     let row = await sql.get(`SELECT * FROM daily WHERE userId="${msg.author.id}"`);
        //     await sql.run(`UPDATE daily SET xp="${row.xp + refund}" WHERE userId="${msg.author.id}"`);
        //     await msg.channel.embed(`You have been refunded ${refund} credits for having ${count} song role(s)`);
        // } catch(e) {
        //     await msg.channel.embed("There was an error. Please try again or contact poot.")
        // }
        
    },
    info: {
        aliases: false,
        example: "!sr",
        minarg: 0,
        description: "Gives a one time refund for song roles losing color",
        category: "Staff",
    }
}