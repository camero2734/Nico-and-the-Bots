import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const { CLANCY, SAI, TRENCH, BF, VSL, RAB, ST } = roles.albums;
const albumRoles = {
    "Clancy": CLANCY,
    "Scaled and Icy": SAI,
    Trench: TRENCH,
    Blurryface: BF,
    Vessel: VSL,
    "Regional at Best": RAB,
    "Self Titled": ST,
};

const command = new SlashCommand({
    description: "Get a role for one of the band's albums",
    options: [
        {
            name: "album",
            description: "The album role to get",
            required: true,
            type: ApplicationCommandOptionType.String,
            choices: Object.entries(albumRoles).map(([name, roleID]) => ({
                name,
                value: roleID
            }))
        }
    ]
});

command.setHandler(async (ctx) => {
    const roleID = ctx.opts.album;

    const idList = Object.values(albumRoles);

    if (!idList.some((r) => r === roleID)) throw new CommandError("Not a valid album");

    let removedAll = false;
    for (const id of idList) {
        if (ctx.member.roles.cache.has(id)) {
            await ctx.member.roles.remove(id);
            if (id === roleID) removedAll = true;
        }
    }

    if (removedAll) {
        const embed = new EmbedBuilder({ description: "Your album role was removed" });
        return ctx.send({ embeds: [embed] });
    }

    await ctx.member.roles.add(roleID);
    const role = await ctx.member.guild.roles.fetch(roleID);
    if (!role) throw new CommandError("Unable to find role");

    const embed = new EmbedBuilder().setDescription(`You now have the ${role.name} album role!`).setColor(role.color);

    ctx.send({ embeds: [embed] });
});

export default command;
