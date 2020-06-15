module.exports = {
    execute: async function (msg) {
        if (!msg.member.roles.get("330877657132564480")) return msg.channel.embed("You must be a staff member to use this command");

        if (!msg.mentions || !msg.mentions.users) return msg.channel.embed("You must mention at least one valid user");
        let mentionedUsers = msg.mentions.users.array().filter(u => !u.bot);
        if (mentionedUsers.length < 1) return msg.channel.embed("You must mention at least one valid user");


        let amount = msg.content.match(/ -{0,1}\d+/);
        if (!amount || isNaN(amount)) return msg.channel.embed("You must supply a valid amount of credits to give");
        amount = parseInt(amount);

        for (let user of mentionedUsers) {
            let userEconomy = await connection.getRepository(Economy).findOne({ id: user.id });
            if (!userEconomy) userEconomy = new Economy({id: user.id});

            userEconomy.credits += amount;
            if (userEconomy.credits < 0) userEconomy.credits = 0;

            await connection.manager.save(userEconomy);
        }

        let embed = new Discord.RichEmbed()
            .setTitle(`${msg.member.displayName} gave ${amount} credits`)
            .setFooter(new Date(), msg.author.displayAvatarURL)
            .addField("To", mentionedUsers.map(u => `${u}`).join(" "));

        await msg.channel.send(embed);

        embed.addField("IDS", mentionedUsers.map(u => u.id).join(" "));

        await msg.guild.channels.get(chans.staffcommandlog).send(embed);
    },
    info: {
        aliases: false,
        example: "!givecredits @user [amount]",
        minarg: 0,
        description: "Gives a user a certain amount of credits and logs the transaction",
        category: "Staff"
    }
};
