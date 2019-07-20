module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        try {
            let row = await sql.get(`SELECT * FROM feeds WHERE link="${msg.args[1]}"`);
            if (!row) return msg.channel.embed("Invalid URL");
            else {
                await sql.run(`DELETE FROM feeds WHERE link="${row.link}"`);
                msg.channel.embed("Deleted!")
            }
        } catch(e) {
            console.log("row error " + e)
        }
        
        
    },
    info: {
        aliases: false,
        example: "!removetopfeed [post url]",
        minarg: 0,
        description: "Removes a post from topfeed.",
        category: "Staff",
    }
}