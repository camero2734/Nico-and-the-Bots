import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { Economy } from "database/entities/Economy";
import { MessageEmbed, Snowflake } from "discord.js";
import ago from "s-ago";
import ordinal from "ordinal";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Displays some information about a user",
    options: [
        {
            name: "user",
            description: "The user to get info for",
            required: false,
            type: CommandOptionType.USER
        }
    ]
};

export const Executor: CommandRunner<{ user?: Snowflake }> = async (ctx) => {
    const userID = ctx.opts.user || (ctx.user.id as Snowflake);

    const member = await ctx.channel.guild.members.fetch(userID);
    if (!member) throw new CommandError("Unable to find member");

    // Fetch some info
    const golds =
        (await ctx.connection.getRepository(Counter).findOne({ identifier: userID, title: "GoldCount" })) ||
        new Counter({ identifier: userID, title: "GoldCount" });

    const economy =
        (await ctx.connection.getRepository(Economy).findOne({ userid: userID })) || new Economy({ userid: userID });

    const joinedNum = await economy.getJoinedNum();

    const embed = new MessageEmbed()
        .setTitle(member.displayName)
        .setThumbnail(member.user.displayAvatarURL())
        .addField("Account created on", `${member.user.createdAt}`)
        .addField("Originally joined on", `${economy.joinedAt}`)
        .addField("Last joined on", `${member.joinedAt || new Date()}`)
        .addField("Golds", `${golds.count}`, true)
        .setFooter(`${ordinal(joinedNum)} member | Use the /submit joindate command if your join date is incorrect`);

    await ctx.send({ embeds: [embed.toJSON()] });
};
