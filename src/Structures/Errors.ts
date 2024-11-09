import { ChannelType, CommandInteraction, DMChannel, EmbedBuilder, GuildTextBasedChannel, Interaction, InteractionType, TextBasedChannel, TextChannel } from "discord.js";
import { nanoid } from "nanoid";
import { guild } from "../../app";
import { channelIDs } from "../Configuration/config";
import { CommandError } from "../Configuration/definitions";
import F from "../Helpers/funcs";

const getReplyMethod = async (ctx: CommandInteraction) => {
    if (!ctx.isRepliable() || !ctx.isChatInputCommand()) {
        console.log(ctx.id, "followUp");
        return ctx.followUp;
    }

    if (!ctx.deferred && !ctx.replied) {
        console.log(ctx.id, "Deferring reply...");
        const reply = await ctx.deferReply({ ephemeral: true, fetchReply: true });
        if (reply.content) {
            console.log(ctx.id, "editReply");
            return ctx.editReply;
        }
        console.log(ctx.id, "followUp2");
        return ctx.followUp;
    }
    console.log(ctx.id, "editReply2");
    return ctx.editReply;
}

let errorChannel: GuildTextBasedChannel | null = null;
const getErrorChannel = async () => {
    if (errorChannel) return errorChannel;

    const channel = await guild?.channels.fetch(channelIDs.errorlog);
    if (!channel || channel.type !== ChannelType.GuildText) return null;

    return errorChannel = channel;
}

const getChannelName = (ctx: TextBasedChannel | Interaction): string => {
    if ("name" in ctx) return `Text: ${ctx.name}`;
    if ("recipient" in ctx) return `DM: ${ctx.recipient?.tag}`;

    const interactionType = F.keys(InteractionType).find(k => InteractionType[k as keyof typeof InteractionType] === ctx.type) || "Unknown Interaction";
    return `${interactionType}: ${ctx.user.tag} in ${ctx.channel ? getChannelName(ctx.channel) : "?"}`
}

export const ErrorHandler = async (ctx: TextChannel | DMChannel | Interaction, e: unknown, handler?: string, receivedInteractionAt?: Date) => {
    const errorId = nanoid();
    const errorDelta = receivedInteractionAt ? Date.now() - receivedInteractionAt.getTime() : null;

    console.log("===================================");
    console.log("||                               ||");
    console.log(`----> ${(e as object).constructor.name} Error!`);
    console.log(`----> Error ID: ${errorId}`);
    console.log("||                               ||");
    console.log("===================================");
    if (e instanceof Error) console.log(e.stack);

    let sentInErrorChannel = false;
    const errorChannel = await getErrorChannel();
    if (errorChannel && !(e instanceof CommandError)) {
        const embed = new EmbedBuilder()
            .setTitle("An error occurred!")
            .setColor("DarkRed")
            .setDescription(`An error occurred in ${ctx.constructor.name}.\nError ID: ${errorId}`)
            .addFields({
                name: "Channel",
                value: getChannelName(ctx),
            })
            .setTimestamp()
            .setFooter({ text: errorId });

        if (handler) {
            embed.addFields({
                name: "Handler",
                value: handler,
            });
        }

        if (errorDelta) {
            embed.addFields({
                name: "Time to Error",
                value: `${errorDelta}ms`,
            });
        }

        embed.addFields({
            name: "Error",
            value: `\`\`\`js\n${e instanceof Error ? e.stack : e}\`\`\``,
        })
        await errorChannel.send({ embeds: [embed] });
        sentInErrorChannel = true;
    }

    const ectx = ctx as unknown as CommandInteraction & { send: CommandInteraction["reply"] };
    ectx.send = await getReplyMethod(ectx) as typeof ectx["send"];

    if (!ectx.send) return;

    if (e instanceof CommandError) {
        const embed = new EmbedBuilder()
            .setDescription(e.message)
            .setTitle("An error occurred!")
            .setColor("DarkRed")
            .setFooter({ text: `DEMA internet machine broke. Error ${errorId}` });
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
            .setFooter({ text: `DEMA internet machine really broke. Error ${errorId} ${sentInErrorChannel ? "📝" : ""}` });
        ectx.send({ embeds: [embed], components: [], ephemeral: true });
    }
};
