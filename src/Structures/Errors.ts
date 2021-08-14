import { CommandInteraction, DMChannel, Interaction, MessageEmbed, TextChannel } from "discord.js";

export class CommandError extends Error {}

export const ErrorHandler = (ctx: TextChannel | DMChannel | Interaction, e: unknown) => {
    const ectx = ctx as unknown as CommandInteraction & { send: CommandInteraction["reply"] };
    ectx.send = (
        ectx.send ? ectx.send : ectx.replied || ectx.deferred ? ectx.followUp : ectx.reply
    ) as typeof ectx["send"];

    if (!ectx.send) return;

    if (e instanceof CommandError) {
        const embed = new MessageEmbed()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setFooter("DEMA internet machine broke");
        ectx.send({
            embeds: [embed],
            ephemeral: true,
            allowedMentions: { users: [], roles: [] }
        });
    } else {
        console.log(e);
        const embed = new MessageEmbed()
            .setTitle("An unknown error occurred!")
            .setFooter("DEMA internet machine really broke");
        ectx.send({ embeds: [embed], ephemeral: true });
    }
};
