module.exports = {
    execute: async function (msg) {
        let userColors = await connection.getRepository(Item).find({ id: msg.author.id, type: "ColorRole" });

        for (let i = 0; i < userColors.length; i++) {
            try {
                userColors[i].name = msg.guild.roles.get(userColors[i].title).name;
            } catch (e) {
                userColors[i].name = "invalid";
            }

        }

        if (msg.args[1] && (msg.args[1] !== "count" || msg.author.id !== poot)) {
            let results = fuzzyMatch(userColors, removeCommand(msg.content), { key: "name", getAll: false });
            if (results.length < 1) return msg.channel.embed("No match found!");
            let pickedColor = results[0];

            let hasColor = msg.member.roles.get(pickedColor.title) ? true : false;
            for (let c of userColors) {
                await msg.member.removeRole(c.title);
            }

            if (!hasColor) {
                await msg.member.addRole(pickedColor.title);
                await msg.channel.embed(`You now have the ${pickedColor.name} color role!`);
            } else await msg.channel.embed(`You no longer have the ${pickedColor.name} color role!`);
        } else {
            userColors = userColors
                .filter(c => c.name !== "invalid")
                .map(c => {
                    c.role = msg.guild.roles.get(c.title);
                    return c;
                })
                .sort((a, b) => b.role.position - a.role.position);
            let embed = new Discord.RichEmbed();
            let description = "";
            for (let c of userColors) {
                description += `<@&${c.role.id}>`;
                if (msg.author.id === poot && msg.args[1] === "count") description += ` ${c.role.members.size}`;
                description += "\n";
            }
            embed.setDescription(description);
            msg.channel.send(embed);
        }
    },
    info: {
        aliases: ["cc", "choosecolor", "choosecolors", "pickcolor"],
        example: "!pootscommand2",
        minarg: 0,
        description: "Does stuff",
        category: "Staff"
    }
};
