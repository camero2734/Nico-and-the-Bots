import { channelIDs, roles } from "configuration/config";
import { CommandError, CommandOptions, CommandReactionHandler, CommandRunner } from "configuration/definitions";
import { Item } from "database/entities/Item";
import dayjs from "dayjs";
import { MessageEmbed, TextChannel } from "discord.js";
import { CommandOptionType } from "slash-create";
// import * as ytdl from "youtube-dl";

export const Options: CommandOptions = {
    description: "Submits an interview to the interview channel",
    options: [
        { name: "link", description: "The YouTube URL for the video", required: true, type: CommandOptionType.STRING }
    ]
};

export const Executor: CommandRunner<{ link: string }> = async (ctx) => {
    const url = ctx.opts.link;

    let id = "";
    if (url.indexOf("youtube.com/watch?v=") !== -1) {
        id = (/(?<=watch\?v=).*?(?=$|&|\?)/.exec(url) || [])[0];
    } else if (url.indexOf("youtu.be/") !== -1) {
        id = (/(?<=youtu\.be\/).*?(?=$|&|\?)/.exec(url) || [])[0];
    }

    if (!id) throw new CommandError("Invalid URL.");

    const idItem = await ctx.connection.getRepository(Item).findOne({ identifier: id, type: "InterviewID" });
    if (idItem) throw new CommandError("This interview has already been submitted");

    const embed = new MessageEmbed().setDescription("Fetching video info...").setColor("#111111");
    await ctx.embed(embed);

    const info: Record<string, string> = await new Promise(
        (resolve) => resolve({})
        // ytdl.getInfo(id, (_error, output) => resolve(output as unknown as Record<string, string>))
    );

    const { channel, view_count, fulltitle, thumbnail, upload_date, description } = info;

    const uploadDate = dayjs(upload_date, "YYYYMMDD");

    console.log(channel, view_count, fulltitle, thumbnail);

    const daysSince = dayjs().diff(uploadDate, "day");
    embed.setAuthor(ctx.member.displayName, ctx.user.avatarURL);
    embed.setTitle(info.title);
    embed.addField("Channel", channel, true);
    embed.addField("Views", view_count, true);
    embed.addField("Link", "[Click Here](https://youtu.be/" + id + ")", true);
    embed.setImage(thumbnail);
    embed.setDescription(description || "No description provided");
    embed.setFooter(
        "Uploaded " +
            (daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : daysSince + " days ago") +
            " || Add an interview with the !interview command"
    );

    const interviewsChannel = ctx.channel.guild.channels.cache.get(channelIDs.interviewsubmissions) as TextChannel;

    const m2 = await interviewsChannel.send({ embeds: [embed] });
    await m2.react("✅");
    await m2.react("❌");

    const toSave = new Item({ identifier: id, type: "InterviewID", title: "" });
    await ctx.connection.manager.save(toSave);
    await ctx.embed(new MessageEmbed().setColor("#111111").setDescription("Sent video to staff for approval!"));
};

export const ReactionHandler: CommandReactionHandler = async ({ reaction }): Promise<boolean> => {
    const msg = reaction.message;

    // Verify reaction is to this command
    if (msg.channel.id !== channelIDs.interviewsubmissions || !msg.author?.bot || !msg.embeds[0]?.footer) return false;

    const accepting = reaction.emoji.name === "✅";

    await msg.reactions.removeAll();

    // Do something
    const newEmbed = new MessageEmbed(msg.embeds[0]);
    newEmbed.setColor(accepting ? "#00FF00" : "#FF0000");
    msg.edit({ embeds: [newEmbed] });

    if (accepting) {
        await msg.guild?.roles.cache.get(roles.topfeed.selectable.interviews)?.setMentionable(true);
        const m = await (<TextChannel>msg.guild?.channels.cache.get(channelIDs.interviews))?.send({
            content: `<@&${roles.topfeed.selectable.interviews}>`,
            embeds: [newEmbed]
        });
        await m.react("📺");
    }

    return true;
};
