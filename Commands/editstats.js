module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;
        let id = msg.args[1];
        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) id = msg.mentions.users.first().id;
        if (id.toString().length !== 18) return msg.channel.embed("Invalid user ID");

        const filter = (m => m.author.id === msg.author.id);
        const sendEmbed = async function(text) {return await msg.channel.send(new Discord.RichEmbed().setDescription(text).setColor("RANDOM"))};


        if (msg.args[2]) {
            try {
                let userEconomy = await connection.getRepository(Economy).findOne( {id: id} );
                let key = msg.args[2].split("=")[0];
                let val = msg.args[2].split("=")[1];
                if (userEconomy.hasOwnProperty(key) && key !== "id") userEconomy[key] = val;
                await connection.manager.save(userEconomy);
                await msg.channel.send("Success!");
            } catch(e) {
                console.log(e, /EDITSTATS/)
                await sendEmbed("Editstats timed out.")
            }
            
        } else {
            try {
                let userEconomy = await connection.getRepository(Economy).findOne( {id: id} );
                let keys = Object.keys(userEconomy);
                for (let key of keys) {
                    if (key === "id") continue;
                    let m1 = await sendEmbed(`${key}? Enter -1 to leave unchanged.`);
                    let collected = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time']});
                    let res = collected.first();
                    await m1.delete();
                    await res.delete();
    
                    if (isNaN(res.content)) return sendEmbed("Invalid input. Input must be a number.");
                    let content = parseInt(res.content);
                    if (content !== -1) userEconomy[key] = content;
                }
                await connection.manager.save(userEconomy);
                await msg.channel.send("Success!");
            } catch(e) {
                console.log(e, /EDITSTATS/)
                await sendEmbed("Editstats timed out.")
            }
        }

        
        
    },
    info: {
        aliases: false,
        example: "!editstats [@User]",
        minarg: 0,
        description: "Restores levels, credits, etc.",
        category: "Staff",
    }
}