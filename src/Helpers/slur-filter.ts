import { ActionRow, ButtonComponent, ButtonStyle, Embed, Message, TextChannel } from "discord.js";
import { channelIDs } from "../Configuration/config";

// word1:word2:word3... encoded in base64 to avoid having slurs in plaintext
const slursEncoded =
    "Y2hpbms6dHJhbm55OnRyYW5uaWVzOmZhZzpkeWtlOm5pZ2dlcjpuaWdnYTpkaWtlOmtpa2U6YmVhbmVyOnJldGFyZDpsaWJ0YXJk";

const slurs = Buffer.from(slursEncoded, "base64").toString("utf-8").split(":");

const filter = async (msg: Message): Promise<boolean> => {
    if (msg.author.bot) return false;

    const slur = slurs.find((slur) => msg.content.toLowerCase().includes(slur));
    if (!slur) return false;

    const member = await msg.member?.fetch();
    if (!member) return false;

    const embed = new Embed()
        .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
        .setTitle("I hope you didn't mean that.")
        .setDescription(
            "Please refrain from using slurs. Your message was forwarded to the staff team and will be reviewed."
        )
        .addFields({ name: "Word detected", value: `\`${slur.replace(/[aeiou]/g, "*")}\`` })
        .setFooter({ text: "If this was a false alarm, you have nothing to worry about." });

    await msg.reply({ embeds: [embed] });

    const slurLog = member.guild.channels.cache.get(channelIDs.slurlog) as TextChannel;

    const staffEmbed = new Embed()
        .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
        .setColor(0xff0000)
        .setTitle("Slur detected")
        .setDescription(msg.content)
        .addFields({ name: "Word detected", value: `\`${slur.replace(/[aeiou]/g, "*")}\`` });

    const actionRow = new ActionRow().setComponents(
        new ButtonComponent().setLabel("View context").setStyle(ButtonStyle.Link).setURL(msg.url)
    );

    await slurLog.send({ embeds: [staffEmbed], components: [actionRow] });

    return true;
};

export default filter;
