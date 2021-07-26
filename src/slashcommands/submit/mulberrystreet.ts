import { channelIDs, roles, userIDs } from "configuration/config";
import { CommandError } from "configuration/definitions";
import { MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import FileType from "file-type";
import fetch from "node-fetch";
import { EphemeralInteractionListener } from "../../helpers/ephemeral-interaction-listener";
import F from "../../helpers/funcs";
import { prisma, queries } from "../../helpers/prisma-init";
import { SlashCommand } from "../../helpers/slash-command";

const command = new SlashCommand(<const>{
    description: "Submits an image, video, or audio file to #mulberry-street",
    options: [
        {
            name: "title",
            description: "The title of your piece of art",
            required: true,
            type: "STRING"
        },
        {
            name: "url",
            description: "A direct link to the image, video, or audio file. Max 50MB.",
            required: true,
            type: "STRING"
        }
    ]
});

command.setHandler(async (ctx) => {
    const MAX_FILE_SIZE = 50000000; // 50MB
    const MS_24_HOURS = 1000 * 60 * 60 * 24; // 24 hours in ms
    const { title } = ctx.opts;
    const url = ctx.opts.url.trim();

    const chan = ctx.channel.guild.channels.cache.get(channelIDs.mulberrystreet) as TextChannel;

    if (!ctx.member.roles.cache.has(roles.artistmusician))
        throw new CommandError(
            `Only users with the <@&${roles.artistmusician}> role can submit to Mulberry Street Creations™`
        );

    await ctx.defer({ ephemeral: true });

    // Only allow submissions once/day
    const dbUser = await queries.findOrCreateUser(ctx.user.id);
    const lastSubmitted = dbUser.lastCreationUpload ? dbUser.lastCreationUpload.getTime() : 0;

    if (Date.now() - lastSubmitted < MS_24_HOURS && ctx.user.id !== userIDs.me) {
        const ableToSubmitAgainDate = new Date(lastSubmitted + MS_24_HOURS);
        const timestamp = F.discordTimestamp(ableToSubmitAgainDate, "relative");
        throw new CommandError(`You've already submitted! You can submit again ${timestamp}.`);
    }

    // Validate and fetch url
    if (!F.isValidURL(url)) throw new CommandError("Invalid URL given");

    const res = await fetch(url, { size: MAX_FILE_SIZE }).catch((E) => {
        console.log(E);
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
        .setColor("#E3B3D8")
        .setTitle(`"${title}"`)
        .setDescription(
            `Would you like to submit this to <#${channelIDs.mulberrystreet}>? If not, you can safely dismiss this message.`
        )
        .addField("URL", url)
        .setFooter("Courtesy of Mulberry Street Creations™", "https://i.imgur.com/fkninOC.png");

    const ephemeralListener = new EphemeralInteractionListener(ctx, <const>["msYes"]);
    const [yesId] = ephemeralListener.customIDs;

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "SUCCESS", label: "Submit", customId: yesId })
    ]);

    await ctx.send({ embeds: [embed.toJSON()], components: [actionRow] });

    const buttonPressed = await ephemeralListener.wait();
    if (buttonPressed !== yesId) {
        await ctx.editReply({
            embeds: [new MessageEmbed({ description: "Submission cancelled." })],
            components: []
        });
        return;
    }

    // User submitted it

    await prisma.user.update({ where: { id: ctx.user.id }, data: { lastCreationUpload: new Date() } });

    embed.setDescription("Submitted.");
    const doneEmbed = embed.toJSON();

    embed.description = "";
    embed.fields = [];

    const attachment = new MessageAttachment(buffer, fileName);

    if (fileType.mime.startsWith("image")) {
        embed.setImage(`attachment://${fileName}`);
    }

    const m = await chan.send({ embeds: [embed], files: [attachment] });
    m.react("💙");

    const newActionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", label: "View post", url: m.url })
    ]);

    await ctx.editReply({ embeds: [doneEmbed], components: [newActionRow] });
});

export default command;
