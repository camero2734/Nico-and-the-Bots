import { CommandInteraction, DMChannel, EmbedBuilder, Interaction, TextChannel } from "discord.js";
import { CommandError } from "../Configuration/definitions";

export const ErrorHandler = (ctx: TextChannel | DMChannel | Interaction, e: unknown) => {
    const ectx = ctx as unknown as CommandInteraction & { send: CommandInteraction["reply"] };
    ectx.send = (
        ectx.send ? ectx.send : ectx.replied || ectx.deferred ? ectx.followUp : ectx.reply
    ) as typeof ectx["send"];

    if (!ectx.send) return;

    if (e instanceof CommandError) {
        const embed = new EmbedBuilder()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setFooter({ text: "DEMA internet machine broke" });
        ectx.send({
            embeds: [embed],
            components: [],
            ephemeral: true,
            allowedMentions: { users: [], roles: [] }
        });
    } else {
        console.log(`Unknown error:`, e);
        const embed = new EmbedBuilder()
            .setTitle("An unknown error occurred!")
            .setFooter({ text: "DEMA internet machine really broke" });
        ectx.send({ embeds: [embed], components: [], ephemeral: true });
    }
};
