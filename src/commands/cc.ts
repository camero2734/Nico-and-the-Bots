import { userIDs } from "configuration/config";
import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { Role } from "discord.js";
import { MessageTools } from "helpers";
import FuzzySearch from "fuzzy-search";
import { Connection } from "typeorm";

export default new Command({
    name: "cc",
    aliases: ["choosecolor"],
    description: "Choose a color from the ones you bought from #shop. Use !cc by itself to see a list of them.",
    category: "Roles",
    usage: "!cc (color to choose)",
    example: "!cc Bandito Green",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const colorItems = await connection.getRepository(Item).find({ id: msg.author.id, type: "ColorRole" });

        let userColors = await Promise.all(
            colorItems.map(async (c) => {
                const role = (await msg.guild.roles.fetch(c.title)) as Role;
                return { ...c, role };
            })
        );

        userColors = userColors.filter((c) => c.role);

        // Send list of available colors
        if (msg.args.length <= 0) {
            const orderedColors = userColors.sort((a, b) => b.role.position - a.role.position);

            let description = "";
            for (const c of orderedColors) {
                description += `<@&${c.role.id}>`;
                if (msg.author.id === userIDs.me && msg.args[1] === "count") description += ` ${c.role.members.size}`;
                description += "\n";
            }

            msg.channel.send(MessageTools.textEmbed(description, "#777777"));
        }

        // Pick specified color
        else {
            const searcher = new FuzzySearch(userColors, ["role.name"], { sort: true });
            const scores = searcher.search(msg.argsString);
            if (scores.length <= 0) throw new CommandError("Could not find that color role!");

            const pickedColor = scores[0];

            for (const c of userColors) {
                if (msg.member.roles.cache.has(c.title)) {
                    await msg.member.roles.remove(c.title).catch(() => console.log(`Failed to remove ${c.title}`));
                }
            }

            // Does the user have the role they used this command for?
            const hasColor = msg.member.roles.cache.has(pickedColor.title);

            // If they don't, add it
            if (!hasColor) {
                await msg.member.roles.add(pickedColor.title);
                await msg.channel.send(MessageTools.textEmbed(`You now have the ${pickedColor.role.name} color role!`));
            }
            // If they do, remove it
            else {
                await msg.channel.send(
                    MessageTools.textEmbed(`You no longer have the ${pickedColor.role.name} color role!`)
                );
            }
        }
    }
});
