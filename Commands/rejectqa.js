module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return;

        let mentions = msg.mentions.users;
        if (!mentions || !mentions.first()) return msg.channel.embed("You must @ someone!");

        let id = mentions.first().id;

        let items = await connection.getRepository(Item).find({ id: id, type: "Q&A" });

        if (!items || items.length <= 0) return msg.channel.embed("This user has not submitted a Q&A question");
        else {
            await connection.manager.remove(items);
            await msg.channel.embed(`Deleted ${items.length} Q&A question${items.length === 1 ? "" : "s"} from ${mentions.first()}`);
            let dm = await mentions.first().createDM();
            await dm.embed("Your question has been removed (most likely for being a duplicate). Please submit another using `!qa`.");
        }
    },
    info: {
        aliases: false,
        example: "!pause",
        minarg: 0,
        description: "Removes Q&A from list, allows user to ask another question",
        category: "Staff"
    }
};