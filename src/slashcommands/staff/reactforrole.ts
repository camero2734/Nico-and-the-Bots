import { CommandError, CommandOptions, CommandReactionHandler, CommandRunner } from "configuration/definitions";
import { Message, MessageEmbed, TextChannel } from "discord.js";
import { CommandOptionType } from "slash-create";

export const Options: CommandOptions = {
    description: "Creates a message that users can react to to receive a role",
    options: [
        {
            name: "text",
            description: "The description text for the embed",
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "role",
            description: "The role the reaction should give",
            required: true,
            type: CommandOptionType.ROLE
        },
        {
            name: "reaction",
            description: "The emoji the user should react with to receive the role",
            required: true,
            type: CommandOptionType.STRING
        },
        {
            name: "channel",
            description: "The channel to send it in (defaults to current channel)",
            required: false,
            type: CommandOptionType.STRING
        }
    ]
};

export const Executor: CommandRunner<{ channel?: string; text: string; role: string; reaction: string }> = async (
    ctx
) => {
    const { channel, text, role, reaction } = ctx.opts;

    const roleObj = await ctx.channel.guild.roles.fetch(role);
    if (!roleObj) throw new CommandError("Invalid role given");

    const footerPlain = `reactforrole:${reaction}|||${roleObj.id}|||`;
    const footerBuffer = Buffer.from(footerPlain, "utf-8");

    const embed = new MessageEmbed();
    embed.setTitle(`React with ${reaction} for the ${roleObj.name} role!`);
    embed.setDescription(`${text}\n\nTo remove the role, react with ❌.`);
    embed.setColor(roleObj.hexColor);
    embed.setFooter(`Metadata: ${footerBuffer.toString("utf16le")}`);

    const channelID = channel ? channel.replace(/[<>#]/g, "") : ctx.channel.id;
    const chan = ctx.channel.guild.channels.cache.get(channelID) as TextChannel;

    if (!chan) throw new CommandError("Invalid channel");

    const m = await chan.send(embed);
    await m.react(reaction);
    await m.react("❌");

    await ctx.send({
        embeds: [embed.setDescription("Message sent!")]
    });
};

export const ReactionHandler: CommandReactionHandler = async ({ reaction, user }): Promise<boolean> => {
    const msg = reaction.message;

    if (user.bot) return false;

    // Verify reaction is to this command
    const footerBase64 = msg?.embeds?.[0]?.footer?.text;
    if (!footerBase64 || !footerBase64.startsWith("Metadata: ")) return false;

    const buffer = Buffer.from(footerBase64.split("Metadata: ")[1], "utf16le");
    const footer = buffer.toString("utf-8");

    if (!footer || !footer?.startsWith("reactforrole:")) return false;

    try {
        const [emoji, tempRoleID] = footer.split("reactforrole:")[1].split("|||");
        const roleID = tempRoleID.split("|")[0];
        // prettier-ignore
        if (!emoji.includes(reaction.emoji.identifier) && reaction.emoji.name !== emoji && reaction.emoji.name !== "❌") {
            return true; // Not the correct emoji
        }

        const member = await reaction.message.guild?.members.fetch(user.id);
        if (!member) return true; // Handled, but member doesn't exist (somehow)

        if (reaction.emoji.name === "❌") await member.roles.remove(roleID.trim());
        else await member.roles.add(roleID.trim());
    } catch (e) {
        console.log(e, /REACTION_HANDLE_ERR/);
        return true;
    }

    return true;
};
