import { CommandRunner, createOptions, OptsType } from "configuration/definitions";
import { subHours } from "date-fns";
import { MessageEmbed } from "discord.js";
import { CommandOptionType } from "slash-create";
import { Economy } from "../../database/entities/Economy";

export const Options = createOptions(<const>{
    description: "Deletes a certain number of messages",
    options: [
        {
            name: "hours",
            description: "The number of previous hours to look over",
            required: false,
            type: CommandOptionType.INTEGER
        }
    ]
});

export const Executor: CommandRunner<OptsType<typeof Options>> = async (ctx) => {
    await ctx.defer();

    const hours = ctx.opts.hours || 24;
    const after = subHours(new Date(), hours);

    const count = await ctx.connection.getMongoRepository(Economy).count({ joinedAt: { $gt: after } });

    const embed = new MessageEmbed()
        .setTitle(`In the last ${hours} hours...`)
        .setDescription(`**${count}** user${count === 1 ? "" : "s"} joined`);

    await ctx.send({ embeds: [embed.toJSON()] });
};
