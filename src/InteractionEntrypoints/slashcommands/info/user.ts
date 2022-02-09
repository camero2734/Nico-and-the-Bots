import { CommandError } from "../../../Configuration/definitions";
import { Embed } from "discord.js/packages/discord.js";
import ordinal from "ordinal";
import { queries } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Displays some information about a user",
    options: [
        {
            name: "user",
            description: "The user to get info for",
            required: false,
            type: "USER"
        }
    ]
});

command.setHandler(async (ctx) => {
    const userID = ctx.opts.user || ctx.user.id;
    if (ctx.channel?.type !== "GUILD_TEXT") return;
    const member = await ctx.channel.guild.members.fetch(userID);
    if (!member) throw new CommandError("Unable to find member");
    // Fetch some info
    const dbUser = await queries.findOrCreateUser(userID, { golds: true, dailyBox: true });
    const golds = dbUser.golds.length;

    const joinedNum = 444; //await economy.getJoinedNum();
    const embed = new Embed()
        .setTitle(member.displayName)
        .setThumbnail(member.user.displayAvatarURL())
        .addField("Account created on", `${member.user.createdAt}`)
        .addField("Originally joined on", `${dbUser.joinedAt}`)
        .addField("Last joined on", `${member.joinedAt || new Date()}`)
        .addField("Golds", `${golds}`, true)
        .addField("Daily count", `${dbUser.dailyBox?.dailyCount || 0}`)
        .setFooter(`${ordinal(joinedNum)} member | Use the /submit joindate command if your join date is incorrect`);
    await ctx.send({ embeds: [embed.toJSON()] });
});

export default command;
