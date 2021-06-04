import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Counter } from "database/entities/Counter";
import { MessageEmbed, Snowflake } from "discord.js";
import ago from "s-ago";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Displays some information about your (or another user's) golds",
    options: [
        {
            name: "user",
            description: "The user to get gold info for",
            required: false,
            type: CommandOptionType.USER
        }
    ]
};

export const Executor: CommandRunner<{ user?: Snowflake }> = async (ctx) => {
    const userID = ctx.opts.user || (ctx.user.id as Snowflake);

    const member = await ctx.channel.guild.members.fetch(userID);
    if (!member) throw new CommandError("Unable to find member.");

    const golds =
        (await ctx.connection.getRepository(Counter).findOne({ id: userID, title: "GoldCount" })) ||
        new Counter({ id: userID, title: "GoldCount" });

    const embed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setColor(member.displayHexColor)
        .addField("Gold count", `<:gold:389216023141941249> x${golds.count}`)
        .addField("Last received", golds.count > 0 ? ago(new Date(golds.lastUpdated)) : "Never");

    console.log(ctx.data, /CTX_DATA/);

    await ctx.send({ embeds: [embed.toJSON()] });
};
