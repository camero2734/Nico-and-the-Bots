module.exports = {
    execute: async function(msg) {
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        let tagged = msg.mentions && msg.mentions.users ? msg.mentions.users.first() : null;
        if (!tagged) return msg.channel.embed("No tagged user.");
        let id = tagged.id;
        await connection.getRepository(Item).createQueryBuilder().delete().where("type = :type", { type: "Warning" }).andWhere("id = :id", { id: id }).execute();
    },
    info: {
        aliases: false,
        example: "!clearwarns [@user]",
        minarg: 2,
        description: "Clears a user's warnings",
        category: "Staff"
    }
};