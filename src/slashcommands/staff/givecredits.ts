import { CommandError, CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { CommandOptionType } from "slash-create";
import { roles } from "../../configuration/config";
import parseDuration from "parse-duration";
import { Item } from "../../database/entities/Item";
import { MessageEmbed } from "discord.js";
import { millisecondsToMinutes } from "date-fns";
import { Economy } from "../../database/entities/Economy";

export const Options = createOptions({
    description: "Gives the specified number of credits to the user",
    options: [
        { name: "user", description: "The user to give credits to", required: true, type: CommandOptionType.USER },
        {
            name: "credits",
            description: "The amount of credits to give",
            required: true,
            type: CommandOptionType.INTEGER
        }
    ]
} as const);

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    const { user, credits } = ctx.opts;
    await ctx.defer();

    const member = await ctx.member.guild.members.fetch(user);
    if (!member) throw new CommandError("Could not find that user");
    if (member.id === ctx.user.id) throw new CommandError("You cannot donate credits to yourself");

    // Ensure credits is a reasonable range
    if (Math.abs(credits) > 10_000) throw new CommandError("The number of credits must be between -10,000 and 10,000");

    const userEconomy = await ctx.connection.getRepository(Economy).findOne({ userid: member.id });
    if (!userEconomy) throw new CommandError("This user's Economy hasn't been initialized yet");

    const beforeCredits = userEconomy.credits;
    userEconomy.credits += credits;
    if (userEconomy.credits < 0) userEconomy.credits = 0;

    await ctx.connection.manager.save(userEconomy);

    const embed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle(`Given ${credits} credits`)
        .addField("Before", `${beforeCredits}`)
        .addField("After", `${userEconomy.credits}`);

    await ctx.send({ embeds: [embed.toJSON()] });
};
