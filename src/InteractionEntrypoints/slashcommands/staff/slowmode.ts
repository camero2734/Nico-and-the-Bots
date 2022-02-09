import { Embed, ApplicationCommandOptionType } from "discord.js/packages/discord.js";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";

const command = new SlashCommand(<const>{
    description: "Enables slow mode in the channel",
    options: [
        {
            name: "time",
            description: "Time for slowmode in seconds. 0 = off",
            required: true,
            type: ApplicationCommandOptionType.Integer
        }
    ]
});

command.setHandler(async (ctx) => {
    if (ctx.opts.time < 0) throw new CommandError("Must be non-negative");

    await ctx.deferReply();

    await ctx.channel.setRateLimitPerUser(ctx.opts.time);

    const embed = new Embed().setAuthor({
        name: `Slowmode ${ctx.opts.time ? "enabled" : "disabled"}`,
        iconURL: ctx.client.user?.displayAvatarURL()
    });

    if (ctx.opts.time) {
        embed.addField({ name: "Time (seconds)", value: `${ctx.opts.time}` });
    }

    await ctx.editReply({ embeds: [embed] });
});

export default command;
