import { CommandInteraction, DMChannel, Interaction, MessageEmbed, TextChannel } from "discord.js";
import { CommandError } from "../Configuration/definitions";
import { rollbar } from "../Helpers/logging/rollbar";

export const ErrorHandler = (ctx: TextChannel | DMChannel | Interaction, e: unknown) => {
    const ectx = ctx as unknown as CommandInteraction & { send: CommandInteraction["reply"] };
    ectx.send = (
        ectx.send ? ectx.send : ectx.replied || ectx.deferred ? ectx.editReply : ectx.reply
    ) as typeof ectx["send"];

    if (!ectx.send) return;

    if (e instanceof CommandError) {
        const embed = new MessageEmbed()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setFooter("DEMA internet machine broke");
        ectx.send({
            embeds: [embed],
            components: [],
            ephemeral: true,
            allowedMentions: { users: [], roles: [] }
        });
    } else {
        console.log(`Unknown error:`, e);
        if (e instanceof Error) rollbar.error(e);
        else rollbar.error(`${e}`);
        const embed = new MessageEmbed()
            .setTitle("An unknown error occurred!")
            .setFooter("DEMA internet machine really broke");
        ectx.send({ embeds: [embed], components: [], ephemeral: true });
    }
};
