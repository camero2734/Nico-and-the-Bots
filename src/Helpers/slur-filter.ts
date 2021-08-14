import { channelIDs } from "../Configuration/config";
import { Message, MessageActionRow, MessageButton, MessageEmbed, TextChannel } from "discord.js";

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

    const embed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setTitle("I hope you didn't mean that.")
        .setDescription(
            "Please refrain from using slurs. Your message was forwarded to the staff team and will be reviewed."
        )
        .addField("Word detected", `\`${slur.replace(/[aeiou]/g, "*")}\``)
        .setFooter("If this was a false alarm, you have nothing to worry about.");

    await msg.reply({ embeds: [embed] });

    const slurLog = member.guild.channels.cache.get(channelIDs.slurlog) as TextChannel;

    const staffEmbed = new MessageEmbed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setColor("#FF0000")
        .setTitle("Slur detected")
        .setDescription(msg.content)
        .addField("Word detected", `\`${slur.replace(/[aeiou]/g, "*")}\``);

    const actionRow = new MessageActionRow();
    actionRow.addComponents([new MessageButton({ label: "View context", style: "LINK", url: msg.url })]);

    await slurLog.send({ embeds: [staffEmbed], components: [actionRow] });

    return true;
};

export default filter;
