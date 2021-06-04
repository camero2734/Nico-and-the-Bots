import { categoryIDs, guildID, roles } from "configuration/config";
import { CommandComponentListener, CommandOptions, CommandRunner } from "configuration/definitions";
import { Message, TextChannel } from "discord.js";
import { MessageButton } from "discord.js";
import { MessageActionRow } from "discord.js";
import { MessageEmbed, OverwriteData, Snowflake } from "discord.js";
import { CommandOptionType, ComponentActionRow } from "slash-create";
import F from "helpers/funcs";

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
const closeChannel = new CommandComponentListener("jailclose", []);
export const ComponentListeners: CommandComponentListener[] = [unmuteAllUsers, closeChannel];

type users = "user2" | "user3" | "user4" | "user5";
type RequiredTypes = { user: Snowflake; explanation: string };
type OptionalTypes = Partial<Record<users, Snowflake>>;

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
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
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
    const jailChan = await ctx.member.guild.channels.create(`jail-${names}`, { type: "text", permissionOverwrites });

    // Put channel in correct category
    await jailChan.setParent(categoryIDs.chilltown);

    // Send a message there
    const jailEmbed = new MessageEmbed()
        .setDescription(
            "You have been added to jail, which means your conduct has fallen below what is expected of this server.\n\n**Please wait for a staff member.**"
        )
        .addField(
            "Note for staff",
            "All users are muted by default. You can `/staff unmute` them individually or press the Unmute All button below."
        );

    if (explanation) jailEmbed.addField("Initial explanation", explanation);

    const jailActionRow = new MessageActionRow().addComponents([
        new MessageButton({
            style: "SECONDARY",
            label: "Unmute all users",
            customID: unmuteAllUsers.generateCustomID({
                // Compresses user ids to base64 and as an array
                base64idarray: members.map((m) => F.snowflakeToRadix64(m.user.id)).join(",")
            })
        }),
        new MessageButton({ style: "DANGER", label: "Close channel", customID: closeChannel.generateCustomID({}) })
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
    // Staff only
    const guild = await interaction.client.guilds.fetch(guildID);
    const channel = interaction.channel as TextChannel;
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
    await interaction.reply({ embeds: [replyEmbed.toJSON()] });

    // Remove button
    const msg = interaction.message as Message;
    msg.components[0].components = msg.components[0].components.filter((btn) => btn.customID !== interaction.customID);

    await msg.edit({ components: msg.components });
};

closeChannel.handler = async (interaction, connection) => {
    // Staff only
    const guild = await interaction.client.guilds.fetch(guildID);
    const interactionMem = await guild.members.fetch(interaction.user.id);
    if (!interactionMem?.roles.cache.has(roles.staff)) return;

    // Send warning message, add cancel button
};
