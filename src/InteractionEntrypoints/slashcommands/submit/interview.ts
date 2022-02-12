import { CommandError } from "../../../Configuration/definitions";
import {
    ActionRowComponent,
    ButtonComponent,
    Embed,
    TextChannel,
    ApplicationCommandOptionType,
    ActionRow,
    ButtonStyle
} from "discord.js/packages/discord.js";
import { prisma } from "../../../Helpers/prisma-init";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import * as ytdl from "youtube-dl";
import { parse } from "date-fns";
import F from "../../../Helpers/funcs";
import { channelIDs, roles } from "../../../Configuration/config";

const command = new SlashCommand(<const>{
    description: "Submits an interview to the interview channel",
    options: [
        {
            name: "link",
            description: "The YouTube URL for the video",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ]
});

command.setHandler(async (ctx) => {
    const rawUrl = ctx.opts.link;

    await ctx.deferReply({ ephemeral: true });

    let id = "";
    if (rawUrl.indexOf("youtube.com/watch?v=") !== -1) {
        id = (/(?<=watch\?v=).*?(?=$|&|\?)/.exec(rawUrl) || [])[0];
    } else if (rawUrl.indexOf("youtu.be/") !== -1) {
        id = (/(?<=youtu\.be\/).*?(?=$|&|\?)/.exec(rawUrl) || [])[0];
    }
    if (!id) throw new CommandError("Invalid URL.");
    const url = `https://youtube.com/watch?v=${id}`;

    const existingInterview = await prisma.submittedInterview.findUnique({
        where: { url }
    });
    if (existingInterview) throw new CommandError("This interview has already been submitted");

    // Fetch info
    const embed = new Embed().setDescription("Fetching video info...").setColor(0x111111);
    await ctx.send({ embeds: [embed] });

    const info: Record<string, string> = await new Promise((resolve) =>
        ytdl.getInfo(id, (_error, output) => resolve(output as unknown as Record<string, string>))
    );

    const { channel, view_count, fulltitle, thumbnail, upload_date, description } = info;

    const uploadDate = parse(upload_date, "yyyyMMdd", new Date());

    console.log(channel, view_count, fulltitle, thumbnail);

    embed.setAuthor({ name: ctx.member.displayName, iconURL: ctx.user.displayAvatarURL() });
    embed.setTitle(info.title);
    embed.addField({ name: "Channel", value: channel, inline: true });
    embed.addField({ name: "Views", value: `${view_count}`, inline: true });
    embed.addField({ name: "Link", value: "[Click Here](https://youtu.be/" + id + ")", inline: true });
    embed.setImage(thumbnail);
    embed.setDescription(description || "No description provided");
    embed.addField({ name: "Uploaded", value: F.discordTimestamp(uploadDate, "relative") });

    const interviewsChannel = ctx.channel.guild.channels.cache.get(channelIDs.interviewsubmissions) as TextChannel;

    const dbInterview = await prisma.submittedInterview.create({
        data: { url, submittedByUserId: ctx.user.id }
    });

    const actionRow = new ActionRow().setComponents([
        new ButtonComponent()
            .setLabel("Approve")
            .setCustomId(genYesID({ interviewId: `${dbInterview.id}` }))
            .setStyle(ButtonStyle.Success)
    ]);

    await interviewsChannel.send({ embeds: [embed], components: [actionRow] });

    const finalEmbed = new Embed().setColor(0x111111).setDescription("Sent video to staff for approval!");
    await ctx.send({ embeds: [finalEmbed] });
});

const genYesID = command.addInteractionListener("intvwYes", <const>["interviewId"], async (ctx, args) => {
    const embed = ctx.message.embeds[0];
    embed.setColor(0x00ff00);

    await ctx.editReply({ components: [], embeds: [embed] });
    const chan = <TextChannel>ctx.guild.channels.cache.get(channelIDs.interviews);

    await chan.send({ content: `<@&${roles.topfeed.selectable.interviews}>`, embeds: [embed] });
});

// const ReactionHandler: CommandReactionHandler = async ({ reaction }): Promise<boolean> => {
//     const msg = reaction.message;

//     // Verify reaction is to this command
//     if (msg.channel.id !== channelIDs.interviewsubmissions || !msg.author?.bot || !msg.embeds[0]?.footer) return false;

//     const accepting = reaction.emoji.name === "✅";

//     await msg.reactions.removeAll();

//     // Do something
//     const newEmbed = new Embed(msg.embeds[0]);
//     newEmbed.setColor(accepting ? "#00FF00" : "#FF0000");
//     msg.edit({ embeds: [newEmbed] });

//     if (accepting) {
//         await msg.guild?.roles.cache.get(roles.topfeed.selectable.interviews)?.setMentionable(true);
//         const m = await (<TextChannel>msg.guild?.channels.cache.get(channelIDs.interviews))?.send({
//             content: `<@&${roles.topfeed.selectable.interviews}>`,
//             embeds: [newEmbed]
//         });
//         await m.react("📺");
//     }

//     return true;
// };

export default command;
