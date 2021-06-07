import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import fetch from "node-fetch";
import FileType from "file-type";
import { CommandOptionType, ComponentActionRow } from "slash-create";
import { MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { channelIDs, roles, userIDs } from "configuration/config";
import { Counter } from "database/entities/Counter";
import ago from "s-ago";

export const Options: CommandOptions = {
    description: "Submits an image, video, or audio file to #mulberry-street",
    options: [
        {
            name: "title",
            description: "The title of your piece of art",
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "url",
            description: "A direct link to the image, video, or audio file. Max 50MB.",
            required: true,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ title: string; url: string }> = async (ctx) => {
    const MAX_FILE_SIZE = 50000000; // 50MB
    const MS_24_HOURS = 1000 * 60 * 60 * 24; // 24 hours in ms
    const { title, url } = ctx.opts;

    const chan = ctx.channel.guild.channels.cache.get(channelIDs.mulberrystreet) as TextChannel;

    if (!ctx.member.roles.cache.has(roles.artistmusician))
        throw new CommandError(
            `Only users with the <@&${roles.artistmusician}> role can submit to Mulberry Street Creations™`
        );

    await ctx.defer(true);

    // Only allow submissions once/day
    let submissionsCounter = await ctx.connection
        .getRepository(Counter)
        .findOne({ identifier: ctx.user.id, title: "MulberryCreations" });

    if (!submissionsCounter) {
        submissionsCounter = new Counter({ identifier: ctx.user.id, title: "MulberryCreations", lastUpdated: 0 });
        submissionsCounter.lastUpdated = 0;
    }

    console.log(submissionsCounter.lastUpdated, /LAST_UPDATED/);

    if (Date.now() - submissionsCounter.lastUpdated < MS_24_HOURS && ctx.user.id !== userIDs.me) {
        const msRemaining = submissionsCounter.lastUpdated + MS_24_HOURS - Date.now();
        const timeRemaining = ago(new Date(Date.now() + msRemaining), "hour");
        throw new CommandError(`You need to wait ${timeRemaining} before submitting another creation!`);
    }

    submissionsCounter.count++;
    submissionsCounter.lastUpdated = Date.now();

    // Validate and fetch url
    if (!isValidURL(url)) throw new CommandError("Invalid URL given");

    const res = await fetch(url, { size: MAX_FILE_SIZE }).catch(() => {
        throw new CommandError("Unable to get the file from that URL.");
    });

    const buffer = await res.buffer();

    const fileType = await FileType.fromBuffer(buffer);
    if (!fileType) throw new CommandError("An error occurred while parsing your file");

    if (!["audio", "video", "image"].some((mime) => fileType.mime.startsWith(mime))) {
        console.log(fileType);
        throw new CommandError("Invalid file type. Must be a url to an image, video, or audio file.");
    }

    const fileName = `${title.split(" ").join("-")}.${fileType.ext}`;

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .setColor("E3B3D8")
        .setTitle(`"${title}"`)
        .setDescription(
            `Would you like to submit this to <#${channelIDs.mulberrystreet}>? If not, you can safely dismiss this message.`
        )
        .addField("URL", url)
        .setFooter("Courtesy of Mulberry Street Creations™", "https://i.imgur.com/fkninOC.png");

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "SUCCESS", label: "Submit", customID: "submit-mulberry" })
    ]);

    const componentActionRow = (<unknown>actionRow) as ComponentActionRow;
    await ctx.send({ embeds: [embed.toJSON()], components: [componentActionRow] });

    ctx.registerComponent("submit-mulberry", async (btnCtx) => {
        await ctx.connection.manager.save(submissionsCounter);
        embed.setDescription("Submitted.");
        const doneEmbed = embed.toJSON();

        embed.description = "";
        embed.fields = [];

        const attachment = new MessageAttachment(buffer, fileName);

        if (fileType.mime.startsWith("image")) {
            embed.setImage(`attachment://${fileName}`);
        }

        const m = await chan.send({ embed, files: [attachment] });

        m.react("💙");

        const newActionRow = (<unknown>(
            new MessageActionRow().addComponents([new MessageButton({ style: "LINK", label: "View post", url: m.url })])
        )) as ComponentActionRow;

        await btnCtx.editParent({ embeds: [doneEmbed], components: [newActionRow] });
    });
};

function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (err) {
        return false;
    }
}
