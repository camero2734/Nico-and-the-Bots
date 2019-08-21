module.exports = {
    execute: async function (msg) {
        let userItem = await connection.getRepository(Item).findOne({ id: msg.author.id, type: "FM" });
        if (!userItem) userItem = new Item(msg.author.id, "", "FM", Date.now());
        userItem.time = Date.now();
        userItem.title = removeCommand(msg.content);
        await connection.manager.save(userItem);
        //msg.channel.embed("Succesfully updated your FM username to `" + userItem.title + "`");
    },
    info: {
        aliases: false,
        example: "!setfm [username]",
        minarg: 0,
        description: "Sets your !fm username",
        category: "FM"
    }
};