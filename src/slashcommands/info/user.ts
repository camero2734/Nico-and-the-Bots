import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { MessageEmbed, Snowflake, TextChannel } from "discord.js";
import ago from "s-ago";
import ordinal from "ordinal";
import { CommandOptionType } from "slash-create";
import { SlashCommand } from "../../helpers/slash-command";
import { queries } from "../../helpers/prisma-init";

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
    if (ctx.channel?.type !== "text") return;
    const member = await ctx.channel.guild.members.fetch(userID);
    if (!member) throw new CommandError("Unable to find member");
    // Fetch some info
    const dbUser = await queries.findOrCreateUser(userID, { golds: true });
    const golds = dbUser.golds.length;

    const joinedNum = 444; //await economy.getJoinedNum();
    const embed = new MessageEmbed()
        .setTitle(member.displayName)
        .setThumbnail(member.user.displayAvatarURL())
        .addField("Account created on", `${member.user.createdAt}`)
        .addField("Originally joined on", `${dbUser.joinedAt}`)
        .addField("Last joined on", `${member.joinedAt || new Date()}`)
        .addField("Golds", `${golds}`, true)
        .setFooter(`${ordinal(joinedNum)} member | Use the /submit joindate command if your join date is incorrect`);
    await ctx.send({ embeds: [embed.toJSON()] });
});

export default command;
