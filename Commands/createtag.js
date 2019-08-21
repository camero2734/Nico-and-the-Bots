module.exports = {
    execute: async function (msg) {
        let amount = 1000;
        let content = msg.content.replace(/ {2,}/g, " ").trim();
        let args = content.split(" ");
        if (msg.content.indexOf("@") !== -1) return msg.channel.embed("Please do not use '@' in tags!");
        if (msg.content.length >= 1000) return msg.channel.send("Tags must be less than 1000 characters!");

        let userEconomy = await connection.getRepository(Economy).findOne({ id: msg.author.id });

        if (userEconomy.credits < amount) return msg.channel.embed(`You don't have enough credits to buy a tag! They cost ${amount} credits!`);

        let tagname = args[1];
        if (tags[tagname]) return msg.channel.send("Tag already exists!");
        args.shift();
        args.shift();
        let toTag = args.join(" ");

        let embed = new Discord.RichEmbed({ description: msg.member.displayName + ", do you want to purchase the tag `" + tagname + "` that says `" + toTag + "` for " + amount + " credits?" }).setColor("RANDOM").setFooter("Respond with 'yes' or 'no'", bot.user.displayAvatarURL);
        let m2 = await msg.channel.send(embed);
        const filter = (m => m.author.id === msg.author.id);
        let collected = await msg.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ["time"] });

        await m2.delete();
        let answer = collected.first();
        await answer.delete();

        if (answer.content.toLowerCase() === "no" || answer.content === "") {
            return msg.channel.embed("Tag creation was cancelled.");
        } else if (answer.content.toLowerCase() === "yes") {
            userEconomy.credits-=amount;
            tags[tagname] = {};
            tags[tagname].tag = toTag;
            tags[tagname].num = 0;
            tags[tagname].user = msg.author.id;
            await writeJsonFile("tags.json", tags);
            await connection.manager.save(userEconomy);
            await msg.channel.embed("New tag created...\nName: " + tagname + "\nTag: " + toTag);
        } else {
            return await msg.channel.embed("Because you replied with something other than 'yes' or 'no', your tag creation was cancelled.");
        }
    },
    info: {
        aliases: false,
        example: "!createtag [tagname] [tag text]",
        minarg: 3,
        description: "Creates a tag to use via !tag [tag name]",
        category: "Tags"
    }
};