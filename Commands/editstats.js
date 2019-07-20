module.exports = {
    execute: async function (msg) {
        if (msg.author.id !== poot) return;

        let id = removeCommand(msg.content);

        if (msg.mentions && msg.mentions.users && msg.mentions.users.first()) mentioned = msg.mentions.users.first().id;

        if (id.toString().length !== 18) return msg.channel.embed("Invalid user ID")

        const filter = (m => m.author.id === msg.author.id);
        const sendEmbed = async function(text) {return await msg.channel.send(new Discord.RichEmbed().setDescription(text).setColor("RANDOM"))};

        try {
            let m1 = await sendEmbed("Monthly score? Enter -1 to leave unchanged.");
            let collected = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time']});
            let monthlyScore = collected.first();
            m1.delete();
            monthlyScore.delete();

            let m2 = await sendEmbed("All-time score? Enter -1 to leave unchanged.");
            let collected2 = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time']});
            let allScore = collected2.first();
            m2.delete();
            allScore.delete();

            let m3 = await sendEmbed("Credits? Enter -1 to leave unchanged.");
            let collected3 = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time']});
            let credits = collected3.first();
            m3.delete();
            credits.delete();

            if (monthlyScore && monthlyScore >= 0) {
                await sql.run(`UPDATE scores SET points="${monthlyScore.content}" WHERE userId="${id}"`);
            }
            if (allScore && allScore >= 0) {
                await sql.run(`UPDATE scores2 SET points="${allScore.content}" WHERE userId="${id}"`);
            }
            if (credits && credits >= 0) {
                await sql.run(`UPDATE daily SET xp="${credits.content}" WHERE userId="${id}"`);
            }

            await sendEmbed("Changed stats successfully.")

        } catch(e) {
            await sendEmbed("Editstats timed out.")
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