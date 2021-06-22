import { guildID } from "configuration/config";
import { CommandError, CommandOptions, CommandRunner } from "configuration/definitions";
import { Economy } from "database/entities/Economy";
import { MessageEmbed, Snowflake, TextChannel } from "discord.js";
import normalizeURL from "normalize-url";
import ordinal from "ordinal";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Sets your join date",
    options: [
        {
            name: "messageurl",
            description: "The link to the first message you sent in the server.",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ messageurl?: string }> = async (ctx) => {
    const rawURL = ctx.opts.messageurl;

    const explainEmbed = new MessageEmbed().setDescription(
        [
            "Because join dates previously weren't stored, this command allows you to restore your join date to when your first message was sent.",
            "",
            "To find the `messageurl` parameter:",
            "`1.` Go to the search bar in the top right corner",
            "`2.` Search for `from:YourNameHere`",
            "`3.` Click on `Old` to sort by oldest",
            "`4.` Right click on the message and click `Copy Message Link`. This is the value you should input into this command.",
            "\n",
            "If you joined before the incident in 2018, or if you didn't send a message for a while, you may message the staff (providing proof if you have it)"
        ].join("\n")
    );

    if (!rawURL) {
        return await ctx.send({ embeds: [explainEmbed.toJSON()] });
    }

    // Ensure it is a valid URL
    // discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
    const url = normalizeURL(rawURL, { stripProtocol: true });
    const parts = url.split("/") as [string, string, string, Snowflake, Snowflake];
    if (parts.length !== 5) throw new CommandError("Invalid url given");

    const [discordPart, channelsPart, guildid, channelid, messageid] = parts;

    if (discordPart !== "discord.com" || channelsPart !== "channels" || guildid !== guildID)
        throw new CommandError("Invalid url given");

    const channel = ctx.channel.guild.channels.cache.get(channelid) as TextChannel;
    if (!channel) throw new CommandError("Unable to find associated channel");

    const msgs = await channel.messages.fetch({ around: messageid, limit: 1 });
    const msg = msgs.first();
    if (!msg) throw new CommandError("Unable to find message");

    if (msg.author.id !== ctx.user.id) throw new CommandError("This is not your message");

    const economy =
        (await ctx.connection.getRepository(Economy).findOne({ userid: ctx.member.id })) ||
        new Economy({ userid: ctx.member.id });

    if (economy.joinedAt < msg.createdAt) throw new CommandError("Your join date is already before this message.");

    const oldJoinedNum = await economy.getJoinedNum();

    economy.joinedAt = msg.createdAt;
    const newJoinedNum = await economy.getJoinedNum();

    const embed = new MessageEmbed()
        .setAuthor(ctx.member.displayName, ctx.member.user.displayAvatarURL())
        .setDescription("Your join date was updated!")
        .addField("Reference message", msg.content || "*No content*")
        .addField("New join date", `${economy.joinedAt}`)
        .addField("Member num change", `${ordinal(oldJoinedNum)} → ${ordinal(newJoinedNum)}`);

    await ctx.connection.manager.save(economy);

    await ctx.send({ embeds: [embed.toJSON()] });
};
