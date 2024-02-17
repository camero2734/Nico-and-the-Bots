import { CommandInteraction, DMChannel, EmbedBuilder, Interaction, TextChannel } from "discord.js";
import { CommandError } from "../Configuration/definitions";

const getReplyMethod = async (ctx: CommandInteraction) => {
    if (!ctx.isRepliable()) return ctx.followUp;

    if (!ctx.deferred && !ctx.replied) await ctx.deferReply({ ephemeral: true });
    return ctx.editReply;
}

export const ErrorHandler = async (ctx: TextChannel | DMChannel | Interaction, e: unknown) => {
    console.log("===================================");
    console.log("||                               ||");
    console.log(`----> ${(e as object).constructor.name} Error!`);
    console.log("||                               ||");
    console.log("===================================");
    if (e instanceof Error) console.log(e.stack);

    const ectx = ctx as unknown as CommandInteraction & { send: CommandInteraction["reply"] };
    ectx.send = await getReplyMethod(ectx) as typeof ectx["send"];

    if (!ectx.send) return;

    if (e instanceof CommandError) {
        const embed = new EmbedBuilder()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setColor("DarkRed")
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
