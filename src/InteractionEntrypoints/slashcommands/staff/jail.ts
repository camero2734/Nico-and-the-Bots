import {
    GuildMember,
    GuildMemberRoleManager,
    MessageActionRow,
    MessageAttachment,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    OverwriteData,
    Snowflake,
    TextChannel
} from "discord.js";
import fetch from "node-fetch";
import { categoryIDs, channelIDs, roles } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { MessageTools } from "../../../Helpers";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { TimedInteractionListener } from "../../../Structures/TimedInteractionListener";
import { ListenerInteraction } from "../../../Structures/ListenerInteraction";

const command = new SlashCommand(<const>{
    description: "Adds user(s) to a jail channel and removes their ability to view all other channels",
    options: [
        {
            name: "user",
            description: "The user to jail",
            required: true,
            type: "USER"
        },
        ...[2, 3, 4, 5].map(
            (num) =>
                <const>{
                    name: `user${num}`,
                    description: "An additional user to jail",
                    required: false,
                    type: "USER"
                }
        ),
        {
            name: "explanation",
            description: "The reason the jail is being created",
            required: false,
            type: "STRING"
        }
    ]
});

enum ActionTypes {
    UNMUTE_ALL,
    REMUTE_ALL,
    CLOSE_JAIL
}

command.setHandler(async (ctx) => {
    const { explanation, ...usersDict } = ctx.opts;
    const ids = Object.values(usersDict) as Snowflake[];

    const members = await Promise.all(ids.map((id) => ctx.member.guild.members.fetch(id)));

    if (members.some((m) => m.roles.highest.comparePositionTo(ctx.member.roles.highest) >= 0 || m.user.bot)) {
        throw new CommandError("You cannot jail bots or someone of equal or higher role.");
    }

    const names = members.map((member) => member.displayName.replace(/[^A-z0-9]/g, "").substring(0, 10)).join("-");
    const mentions = members.map((member) => member.toString());

    // Setup permissions in new channel
    const permissionOverwrites: OverwriteData[] = [
        {
            deny: ["VIEW_CHANNEL"],
            id: ctx.guildId
        },
        {
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
            id: roles.staff // Staff
        },
        {
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "MANAGE_CHANNELS"],
            id: roles.bots // Bots
        },
        {
            deny: ["SEND_MESSAGES"],
            id: roles.muted // Muted
        }
    ];

    for (const member of members) {
        permissionOverwrites.push({ allow: ["VIEW_CHANNEL"], id: member.user.id });
        if (member.roles.cache.has(roles.deatheaters)) {
            await member.roles.remove(roles.deatheaters);
            await member.roles.add(roles.formerde);
        }
        await member.roles.add(roles.muted);
        await member.roles.add(roles.hideallchannels);
    }

    // Create channel
    const jailChan = await ctx.member.guild.channels.create(`jail-${names}`, {
        type: "GUILD_TEXT",
        permissionOverwrites
    });

    // Put channel in correct category
    await jailChan.setParent(categoryIDs.chilltown, { lockPermissions: false });

    // Send a message there
    const jailEmbed = new MessageEmbed()
        .setDescription(
            "You have been added to jail, which means your conduct has fallen below what is expected of this server.\n\n**Please wait for a staff member.**"
        ) // prettier-ignore
        .addField(
            "Note for staff",
            "All users are muted by default. You can `/staff unmute` them individually or press the Unmute Users button below."
        );

    if (explanation) jailEmbed.addField("Initial explanation", explanation);

    jailEmbed.addField("Jailed", F.discordTimestamp(new Date(), "relative"));

    const jailActionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SECONDARY",
            label: "Unmute Users",
            customId: genActionId({
                // Compresses user ids to base64 and as an array
                base64idarray: members.map((m) => F.snowflakeToRadix64(m.user.id)).join(","),
                actionType: ActionTypes.UNMUTE_ALL.toString()
            })
        }),
        new MessageButton({
            style: "DANGER",
            label: "Close channel",
            customId: genActionId({
                base64idarray: members.map((m) => F.snowflakeToRadix64(m.user.id)).join(","),
                actionType: ActionTypes.CLOSE_JAIL.toString()
            })
        })
    ]);

    const m = await jailChan.send({
        content: `${mentions.join(" ")}`,
        embeds: [jailEmbed],
        components: [jailActionRow]
    });

    const commandEmbed = new MessageEmbed()
        .setAuthor(members[0].displayName, members[0].user.displayAvatarURL())
        .setTitle(`${members.length} user${members.length === 1 ? "" : "s"} jailed`)
        .addField("Users", mentions.join("\n"));

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", label: "View channel", url: m.url })
    ]);
    await ctx.send({ embeds: [commandEmbed], components: [actionRow] });
});

type ActionExecutorArgs = {
    base64idarray: string;
    staffMember: GuildMember;
    jailedMembers: GuildMember[];
};

const intArgs = <const>["actionType", "base64idarray"];
const genActionId = command.addInteractionListener("jailunmuteall", intArgs, async (ctx, args) => {
    const base64idarray = args.base64idarray;

    // Staff only
    const staffMember = await ctx.guild.members.fetch(ctx.user.id);
    if (!staffMember?.roles.cache.has(roles.staff)) return;

    // Decode users info
    const users = base64idarray.split(",").map(F.radix64toSnowflake);
    const jailedMembers = await Promise.all(users.map((id) => ctx.guild.members.fetch(id)));

    switch (+args.actionType) {
        case ActionTypes.UNMUTE_ALL:
            unmuteAllUsers(ctx, { staffMember, jailedMembers, base64idarray });
            break;
        case ActionTypes.CLOSE_JAIL:
            closeChannel(ctx, { staffMember, jailedMembers, base64idarray });
            break;
        case ActionTypes.REMUTE_ALL:
            muteAllUsers(ctx, { staffMember, jailedMembers, base64idarray });
            break;
        default:
            return;
    }
});

async function unmuteAllUsers(ctx: ListenerInteraction, args: ActionExecutorArgs): Promise<void> {
    // Remove roles
    for (const member of args.jailedMembers) {
        await member.roles.remove(roles.muted);
    }

    const replyEmbed = new MessageEmbed({ description: `${args.staffMember} unmuted all users` });
    await ctx.followUp({ embeds: [replyEmbed.toJSON()] });

    // Change button to mute
    const msg = ctx.message;
    const [actionRow] = msg.components;
    const button = actionRow.components.find((btn) => btn.customId === ctx.customId);
    if (button?.type !== "BUTTON") return;

    button
        .setCustomId(genActionId({ base64idarray: args.base64idarray, actionType: ActionTypes.REMUTE_ALL.toString() }))
        .setLabel("Remute Users");

    await msg.edit({ components: msg.components });
}

async function muteAllUsers(ctx: ListenerInteraction, args: ActionExecutorArgs): Promise<void> {
    // Add roles
    for (const member of args.jailedMembers) {
        await member.roles.add(roles.muted);
    }

    const replyEmbed = new MessageEmbed({ description: `${args.staffMember} remuted all users` });
    await ctx.followUp({ embeds: [replyEmbed.toJSON()] });

    // Change button to unmute
    const msg = ctx.message;
    const [actionRow] = msg.components;
    const button = actionRow.components.find((btn) => btn.customId === ctx.customId);
    if (button?.type !== "BUTTON") return;

    button
        .setCustomId(genActionId({ base64idarray: args.base64idarray, actionType: ActionTypes.UNMUTE_ALL.toString() }))
        .setLabel("Unmute Users");

    await msg.edit({ components: msg.components });
}

async function closeChannel(ctx: ListenerInteraction, args: ActionExecutorArgs): Promise<void> {
    let cancelled = false;
    let finished = false;

    // Create cancel button, send warning message
    const msg = ctx.message;
    const chan = msg.channel as TextChannel;
    const [actionRow] = msg.components;

    const button = actionRow.components.find((btn) => btn.customId === ctx.customId);
    if (!button) return;

    await msg.edit({ components: [] });

    // prettier-ignore
    const warningEmbed = new MessageEmbed()
        .setDescription("This channel is currently being archived. Once that is done, the channel will be deleted. You may cancel this by pressing the cancel button within the next 2 minutes.")
        .setColor("#FF0000")
        .addField("Closed by", `${args.staffMember}`);

    const m = await chan.send({ embeds: [warningEmbed] });

    const timedListener = new TimedInteractionListener(m, <const>["cancelId"]);
    const [cancelId] = timedListener.customIDs;

    const cancelActionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Cancel", customId: cancelId, style: "DANGER" })
    ]);

    await m.edit({ components: [cancelActionRow] });

    const filter = (interaction: MessageComponentInteraction) => {
        const memRoles = interaction.member?.roles as GuildMemberRoleManager;
        return memRoles?.cache.has(roles.staff);
    };

    timedListener.wait(120 * 1000, filter).then(([buttonPressed]) => {
        if (buttonPressed === cancelId) {
            cancelled = true;
            m.delete();
            msg.edit({ components: [actionRow] }); // Restore to previous state
        } else if (!finished) {
            m.edit({ components: [] }); // Cancellation will happen no matter what
        }
    });

    // Create a backup of messages in the channel
    const messages = await MessageTools.fetchAllMessages(chan);
    let html =
        "<head>\n  <style>\n    body {background-color: #36393f}\n  	.avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

    const reverseMessages = [...messages.values()].reverse();
    for (const message of reverseMessages) {
        if (!message.content && !message.attachments && !message.embeds?.[0]?.description) continue;
        let mhtml = "";

        const displayName = message.member?.displayName || `${message.author.id} (left server)`;
        const content = message.content || message.embeds?.[0]?.description;

        mhtml += `<img class="avatar" src="${message.author.displayAvatarURL()}" align="left" height=40/><span class="username"><b>${displayName}</b></span>  <span class="timestamp">(${
            message.author.id
        })</span>\n`;
        mhtml += `<p display="inline" class="timestamp"> ${message.createdAt
            .toString()
            .replace("Central Standard Time", message.createdTimestamp.toString())} </p>\n`;
        if (content) {
            mhtml += `<p class="textcontent">${fixEmojis(content)}</p>`;
        }
        if (message.attachments) {
            const attachments = [...message.attachments.values()];
            for (const a of attachments) {
                if (a.name?.endsWith("png") || a.name?.endsWith("gif") || a.name?.endsWith("jpg")) {
                    const _file = await fetch(a.url);
                    const base64 = (await _file.buffer()).toString("base64");
                    mhtml += `\n<img src="data:image/jpeg;base64,${base64}"><br><br>`;
                }
            }
        }
        html += `<div>\n${mhtml}\n</div><br>\n`;
    }

    const attachment = new MessageAttachment(Buffer.from(html), `${chan.name}.html`);

    if (cancelled) return; // Don't send anything

    const finalM = await chan.send({
        embeds: [
            new MessageEmbed({
                description: `Fetched ${messages.size} messages. The channel will be deleted in 30 seconds unless cancelled.`
            })
        ]
    });
    await F.wait(30 * 1000);
    if (cancelled) {
        await finalM.delete();
        return;
    } else finished = true;
    // No turning back now
    await chan.send("Sending channel archive...");

    const embed = new MessageEmbed()
        .setTitle("Jail Channel Backup")
        .addField("Users", args.jailedMembers.map((m) => m.toString()).join("\n"))
        .addField("Date", new Date().toString());

    const backupChannel = ctx.guild.channels.cache.get(channelIDs.jaillog) as TextChannel;
    await backupChannel.send({ embeds: [embed], files: [attachment] });

    // DM members the backup too
    for (const member of args.jailedMembers) {
        const dm = await member.createDM();
        if (!dm) continue;

        await dm.send({ embeds: [embed], files: [attachment] });
    }

    await chan.delete();
}

function fixEmojis(text: string) {
    const regCapture = /<(a{0,1}):\w+:(\d{18})>/;
    let finalText = text;
    while (regCapture.test(finalText)) {
        const results = regCapture.exec(finalText) || [];
        const ending = results[1] && results[1] === "a" ? "gif" : "png";
        const id = results[2];
        const newText = `<img src="https://cdn.discordapp.com/emojis/${id}.${ending}" height=20>`;
        finalText = finalText.replace(regCapture, newText);
    }
    return finalText;
}

export default command;
