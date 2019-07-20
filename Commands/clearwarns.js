module.exports = {
    execute: async function(msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        let tagged = msg.mentions && msg.mentions.users ? msg.mentions.users.first() : null;
        if (!tagged) return msg.channel.embed("No tagged user.");
        let id = tagged.id;
        sql.run(`DELETE FROM warn WHERE userid="${id}"`);
    },
    info: {
        aliases: false,
        example: "!clearwarns [@user]",
        minarg: 2,
        description: "Clears a user's warnings",
        category: "Staff",
    }
}