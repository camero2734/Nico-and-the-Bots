import { categoryIDs, channelIDs, guildID, roles } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { GuildMember, GuildMemberRoleManager, Message, MessageAttachment, TextChannel } from "discord.js";
import { MessageButton } from "discord.js";
import { MessageActionRow } from "discord.js";
import { MessageEmbed, OverwriteData, Snowflake } from "discord.js";
import { CommandOptionType, ComponentActionRow } from "slash-create";
import F from "helpers/funcs";
import { MessageContext, MessageTools } from "helpers";
import fetch from "node-fetch";

export const Options: CommandOptions = {
    description: "Adds user(s) to a jail channel and removes their ability to view all other channels",
    options: [
        {
            name: "user",
            description: "The user to jail",
            required: true,
            type: CommandOptionType.USER
        },
        ...[2, 3, 4, 5].map((num) => ({
            name: `user${num}`,
            description: "An additional user to jail",
            required: false,
            type: <const>CommandOptionType.USER
        })),
        {
            name: "explanation",
            description: "The reason the jail is being created",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
};

const unmuteAllUsers = new CommandComponentListener("jailunmuteall", <const>["base64idarray"]);
const muteAllUsers = new CommandComponentListener("jailmuteall", <const>["base64idarray"]);
const closeChannel = new CommandComponentListener("jailclose", <const>["base64idarray"]);
export const ComponentListeners: CommandComponentListener[] = [unmuteAllUsers, muteAllUsers, closeChannel];

type users = "user2" | "user3" | "user4" | "user5";
type RequiredTypes = { user: Snowflake };
type OptionalTypes = Partial<Record<users, Snowflake> & { explanation: string }>;

export const Executor: CommandRunner<RequiredTypes & OptionalTypes> = async (ctx) => {
    const { explanation, ...usersDict } = ctx.opts;
    const ids = Object.values(usersDict) as Snowflake[];

    const members = await Promise.all(ids.map((id) => ctx.member.guild.members.fetch(id)));

    const names = members.map((member) => member.displayName.replace(/[^A-z0-9]/g, "").substring(0, 10)).join("-");
    const mentions = members.map((member) => member.toString());

    // Setup permissions in new channel
    const permissionOverwrites: OverwriteData[] = [
        {
            deny: ["VIEW_CHANNEL"],
            id: ctx.guildID
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

    console.log(permissionOverwrites);

    // Create channel
    const jailChan = await ctx.member.guild.channels.create(`jail-${names}`, { type: "text", permissionOverwrites });

    // Put channel in correct category
    await jailChan.setParent(categoryIDs.chilltown, { lockPermissions: false });

    // Send a message there
    const jailEmbed = new MessageEmbed()
        .setDescription(
            "You have been added to jail, which means your conduct has fallen below what is expected of this server.\n\n**Please wait for a staff member.**"
        )
        .addField(
            "Note for staff",
            "All users are muted by default. You can `/staff unmute` them individually or press the Unmute Users button below."
        );

    if (explanation) jailEmbed.addField("Initial explanation", explanation);

    const jailActionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SECONDARY",
            label: "Unmute Users",
            customID: unmuteAllUsers.generateCustomID({
                // Compresses user ids to base64 and as an array
                base64idarray: members.map((m) => F.snowflakeToRadix64(m.user.id)).join(",")
            })
        }),
        new MessageButton({
            style: "DANGER",
            label: "Close channel",
            customID: closeChannel.generateCustomID({
                base64idarray: members.map((m) => F.snowflakeToRadix64(m.user.id)).join(",")
            })
        })
    ]);

    const m = await jailChan.send(`${mentions.join(" ")}`, { embed: jailEmbed, components: [jailActionRow] });

    const commandEmbed = new MessageEmbed()
        .setAuthor(members[0].displayName, members[0].user.displayAvatarURL())
        .setTitle(`${members.length} user${members.length === 1 ? "" : "s"} jailed`)
        .addField("Users", mentions.join("\n"));

    const actionRow = new MessageActionRow().addComponents([
        new MessageButton({ style: "LINK", label: "View channel", url: m.url })
    ]);
    await ctx.send({ embeds: [commandEmbed.toJSON()], components: [(<unknown>actionRow) as ComponentActionRow] });
};

unmuteAllUsers.handler = async (interaction, connection, args) => {
    await interaction.defer();
    // Staff only
    const guild = await interaction.client.guilds.fetch(guildID);
    const interactionMem = await guild.members.fetch(interaction.user.id);
    if (!interactionMem?.roles.cache.has(roles.staff)) return;

    // Decode users info
    const users = args.base64idarray.split(",").map(F.radix64toSnowflake);
    const members = await Promise.all(users.map((id) => guild.members.fetch(id)));

    // Remove roles
    for (const member of members) {
        await member.roles.remove(roles.muted);
    }

    const replyEmbed = new MessageEmbed({ description: `${interactionMem} unmuted all users` });
    console.log(interaction.isMessageComponent());
    await interaction.editReply({ embeds: [replyEmbed.toJSON()] });

    // Change button to mute
    const msg = interaction.message as Message;
    const [actionRow] = msg.components;
    const button = actionRow.components.find((btn) => btn.customID === interaction.customID);
    if (!button) return;

    button.setCustomID(muteAllUsers.generateCustomID({ base64idarray: args.base64idarray })).setLabel("Remute Users");

    await msg.edit({ components: msg.components });
};

muteAllUsers.handler = async (interaction, connection, args) => {
    await interaction.defer();

    // Staff only
    const guild = await interaction.client.guilds.fetch(guildID);
    const interactionMem = await guild.members.fetch(interaction.user.id);
    if (!interactionMem?.roles.cache.has(roles.staff)) return;

    // Decode users info
    const users = args.base64idarray.split(",").map(F.radix64toSnowflake);
    const members = await Promise.all(users.map((id) => guild.members.fetch(id)));

    // Add roles
    for (const member of members) {
        await member.roles.add(roles.muted);
    }

    const replyEmbed = new MessageEmbed({ description: `${interactionMem} remuted all users` });
    console.log(interaction.isMessageComponent());
    await interaction.editReply({ embeds: [replyEmbed.toJSON()] });

    // Change button to unmute
    const msg = interaction.message as Message;
    const [actionRow] = msg.components;
    const button = actionRow.components.find((btn) => btn.customID === interaction.customID);
    if (!button) return;

    button.setCustomID(unmuteAllUsers.generateCustomID({ base64idarray: args.base64idarray })).setLabel("Unmute Users");

    await msg.edit({ components: msg.components });
};

closeChannel.handler = async (interaction, connection, args) => {
    let cancelled = false;
    // Staff only
    const guild = await interaction.client.guilds.fetch(guildID);
    const interactionMem = await guild.members.fetch(interaction.user.id);
    if (!interactionMem?.roles.cache.has(roles.staff)) return;

    // Decode users info
    const users = args.base64idarray.split(",").map(F.radix64toSnowflake);
    const members = await Promise.all(users.map((id) => guild.members.fetch(id)));

    // Create cancel button, send warning message
    const msg = interaction.message as Message;
    const chan = msg.channel as TextChannel;
    const [actionRow] = msg.components;

    const button = actionRow.components.find((btn) => btn.customID === interaction.customID);
    if (!button) return;

    await msg.edit({ components: [] });

    // prettier-ignore
    const warningEmbed = new MessageEmbed()
        .setDescription("This channel is currently being archived. Once that is done, the channel will be deleted. You may cancel this by pressing the cancel button.")
        .setColor("FF0000")
        .addField("Closed by", interactionMem.toString());

    const cancelActionRow = new MessageActionRow().addComponents([
        new MessageButton({ label: "Cancel", customID: "cancel", style: "DANGER" })
    ]);

    const m = await chan.send({ embed: warningEmbed, components: [cancelActionRow] });

    const ctx = MessageContext(m);
    ctx.registerComponent("cancel", async (btnInter) => {
        const memRoles = btnInter.member?.roles as GuildMemberRoleManager;
        if (!memRoles?.cache?.has(roles.staff)) return;

        ctx.unregisterComponent("cancel");

        // Undo everything
        await m.delete();
        await msg.edit({ components: [actionRow] });
        cancelled = true;
    });

    // Create a backup of messages in the channel
    const messages = await MessageTools.fetchAllMessages(chan);
    let html =
        "<head>\n  <style>\n    body {background-color: #36393f}\n  	.avatar {border-radius: 100%; }\n    .timestamp {font-size: 10px; color: #777777}\n    .textcontent {font-size: 12px; color: white}\n    .username {color: white; font-size: 30px}\n  </style>\n</head>";

    for (const message of messages.array().reverse()) {
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
            const attachments = message.attachments.array();
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

    const finalM = await chan.send(
        new MessageEmbed({
            description: `Fetched ${messages.size} messages. The channel will be deleted in 30 seconds unless cancelled.`
        })
    );
    await F.wait(30 * 1000);
    if (cancelled) {
        await finalM.delete();
        return;
    }
    // No turning back now
    await chan.send("Sending channel archive...");

    const embed = new MessageEmbed()
        .setTitle("Jail Channel Backup")
        .addField("Users", members.map((m) => m.toString()).join("\n"))
        .addField("Date", new Date().toString());

    const backupChannel = guild.channels.cache.get(channelIDs.jaillog) as TextChannel;
    await backupChannel.send({ embed, files: [attachment] });

    // DM members the backup too
    for (const member of members) {
        const dm = await member.createDM();
        if (!dm) continue;

        await dm.send({ embed, files: [attachment] });
    }

    await chan.delete();
};

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
