import { userIDs } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { Role } from "discord.js";
import FuzzySearch from "fuzzy-search";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "choosesong",
    aliases: ["cs", "mysongs", "songroles", "sr"],
    description: "Chooses a song role that you own. Use !choosesong by itself to see a list of them.",
    category: "Roles",
    usage: "!choosesong (song role)",
    example: "!choosesong Fall Away",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const songItems = await connection.getRepository(Item).find({ id: msg.author.id, type: "SongRole" });

        let userSongs = await Promise.all(
            songItems.map(async (s) => {
                const role = (await msg.guild.roles.fetch(s.title)) as Role;
                return { ...s, role };
            })
        );

        userSongs = userSongs.filter((s) => s.role);

        // Display list of available song roles
        if (msg.args.length <= 0) {
            const sorted = userSongs.sort((a, b) => {
                const x = b.role.hexColor.localeCompare(a.role.hexColor);
                return x == 0 ? a.role.name.localeCompare(b.role.name) : x;
            });

            let description = "";
            for (const s of sorted) {
                description += `<@&${s.role.id}>`;
                if (msg.author.id === userIDs.me && msg.args[1] === "count") description += ` ${s.role.members.size}`;
                description += "\n";
            }
            msg.channel.send(MessageTools.textEmbed(description, "#777777"));
        }

        // Give/remove chosen song role
        else {
            const searcher = new FuzzySearch(userSongs, ["role.name"], { sort: true });
            const scores = searcher.search(msg.argsString);
            if (scores.length <= 0) throw new CommandError("Could not find that song role!");

            const pickedSong = scores[0];

            for (const s of userSongs) {
                if (msg.member.roles.cache.has(s.title)) {
                    await msg.member.roles.remove(s.title).catch(() => console.log(`Failed to remove ${s.title}`));
                }
            }

            await msg.member.roles.add(pickedSong.title);
            await msg.channel.send(MessageTools.textEmbed(`You now have the ${pickedSong.role.name} song role!`));
        }
    }
});
