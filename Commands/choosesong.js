module.exports = {
    execute: async function (msg) {
        let userSongs = await connection.getRepository(Item).find({ id: msg.author.id, type: "SongRole" });

        for (let i = 0; i < userSongs.length; i++) {
            userSongs[i].name = msg.guild.roles.get(userSongs[i].title).name;
        }

        if (msg.args[1] && (msg.args[1] !== "count" || msg.author.id !== poot)) {
            let results = fuzzyMatch(userSongs, removeCommand(msg.content), { key: "name", getAll: false });
            if (results.length < 1) return msg.channel.embed("No match found!");
            let pickedSong = results[0];
            
            for (let s of userSongs) {
                await msg.member.removeRole(s.title);
            }
            
            await msg.member.addRole(pickedSong.title);
            await msg.channel.embed(`You now have the ${pickedSong.name} song role!`);
        } else {
            userSongs.map((s) => {
                s.role = msg.guild.roles.get(s.title);
                return s;
            });
            userSongs.sort((a, b) => {
                var x = b.role.hexColor.localeCompare(a.role.hexColor);
                return x == 0 ? a.role.name.localeCompare(b.role.name) : x;
            });
            let embed = new Discord.RichEmbed();
            let description = "";
            for (let s of userSongs) {
                description += `<@&${s.role.id}>`;
                if (msg.author.id === poot && msg.args[1] === "count") description += ` ${s.role.members.size}`;
                description += "\n";
            }
            embed.setDescription(description);
            msg.channel.send(embed);
        }
    },
    info: {
        aliases: ["choosesong", "mysongs", "changesong", "cs"],
        example: "!choosesong [Song role name]",
        minarg: 0,
        description: "Chooses a song role out of the ones you own",
        category: "Roles"
    }
};