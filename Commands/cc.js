module.exports = {
    execute: async function (msg) {
        function hexToHSL(a) { var e = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(a), r = parseInt(e[1], 16), t = parseInt(e[2], 16), n = parseInt(e[3], 16); r /= 255, t /= 255, n /= 255; var s, h, c = Math.max(r, t, n), d = Math.min(r, t, n), f = (c + d) / 2; if (c == d) s = h = 0; else { var i = c - d; switch (h = f > .5 ? i / (2 - c - d) : i / (c + d), c) { case r: s = (t - n) / i + (t < n ? 6 : 0); break; case t: s = (n - r) / i + 2; break; case n: s = (r - t) / i + 4; }s /= 6; } return h *= 100, h = Math.round(h), f *= 100, f = Math.round(f), { h: s = Math.round(360 * s), s: h, l: f }; }
        let userColors = await connection.getRepository(Item).find({ id: msg.author.id, type: "ColorRole" });

        for (let i = 0; i < userColors.length; i++) {
            userColors[i].name = msg.guild.roles.get(userColors[i].title).name;
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
            userColors.map((c) => {
                c.role = msg.guild.roles.get(c.title);
                return c;
            });
            userColors.sort((a, b) => {
                return b.role.position - a.role.position;
            });
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