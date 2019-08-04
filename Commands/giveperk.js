module.exports = {
    execute: async function (msg, args) {
        let perks = ["doubledaily", "blurryboxinc", "lvlcred"];
        if (msg.author.id !== poot) return msg.channel.embed("Only pootus can doodus");
        let perk = args[1];
        if (perks.indexOf(perk) === -1) return msg.channel.embed("Invalid perk name");
        let id = msg.mentions.users.first().id;
        let hasPerk = await connection.getRepository(Item).findOne({ id: id, type: "Perk" });
        if (hasPerk) return msg.channel.embed("This user already has this perk!");
        let newPerk = new Item(id, perk, "Perk", Date.now());
        await connection.manager.save(newPerk);
        await msg.channel.embed("Successfully added the " + perk + " perk for " + msg.mentions.members.first());
    },
    info: {
        aliases: false,
        example: "!giveperk [doubledaily, blurryboxinc, lvlcred] @user",
        minarg: 0,
        description: "Gives a user a perk",
        category: "Staff"
    }
};