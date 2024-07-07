import { ChannelType, CommandInteraction, DMChannel, EmbedBuilder, GuildTextBasedChannel, Interaction, InteractionType, TextBasedChannel, TextChannel } from "discord.js";
import { CommandError } from "../Configuration/definitions";
import { nanoid } from "nanoid";
import { guild } from "../../app";
import { channelIDs } from "../Configuration/config";
import F from "../Helpers/funcs";

const getReplyMethod = async (ctx: CommandInteraction) => {
    if (!ctx.isRepliable() || !ctx.isChatInputCommand()) return ctx.followUp;

    if (!ctx.deferred && !ctx.replied) await ctx.deferReply({ ephemeral: true });
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

export const ErrorHandler = async (ctx: TextChannel | DMChannel | Interaction, e: unknown) => {
    const errorId = nanoid();

    console.log("===================================");
    console.log("||                               ||");
    console.log(`----> ${(e as object).constructor.name} Error!`);
    console.log(`----> Error ID: ${errorId}`);
    console.log("||                               ||");
    console.log("===================================");
    if (e instanceof Error) console.log(e.stack);

    const errorChannel = await getErrorChannel();
    if (errorChannel) {
        const embed = new EmbedBuilder()
            .setTitle("An error occurred!")
            .setColor("DarkRed")
            .setDescription(`An error occurred in ${ctx.constructor.name}.\nError ID: ${errorId}`)
            .addFields([
                {
                    name: "Channel",
                    value: getChannelName(ctx),
                },
                {
                    name: "Error",
                    value: `\`\`\`js\n${e instanceof Error ? e.stack : e}\`\`\``,
                }
            ])
            .setTimestamp()
            .setFooter({ text: errorId });
        await errorChannel.send({ embeds: [embed] });
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
            .setFooter({ text: `DEMA internet machine really broke. Error ${errorId}` });
        ectx.send({ embeds: [embed], components: [], ephemeral: true });
    }
};
