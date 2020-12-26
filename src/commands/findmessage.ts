import { Command, CommandError, CommandMessage } from "configuration/definitions";
import { MessageEmbed, TextChannel } from "discord.js";
import { MessageTools } from "helpers";

export default new Command({
    name: "findmessage",
    description: "Finds a message by ID",
    category: "Info",
    usage: "!findmessage [Message ID]",
    example: "!findmessage 722656614573932584",
    async cmd(msg: CommandMessage): Promise<void> {
        const messageid = msg.args[0];
        if (!messageid) throw new CommandError("You didn't enter a message ID");

        const channels = msg.guild.channels.cache
            .array()
            .filter((c) => c.id !== msg.channel.id && c.type === "text") as TextChannel[];
        channels.unshift(msg.channel as TextChannel);

        const findingMessage = await msg.channel.send(MessageTools.textEmbed("Searching for message..."));

        for (const channel of channels) {
            const perms = channel.permissionsFor(msg.client?.user?.id || "");
            if (!perms?.has("VIEW_CHANNEL")) continue;

            const messages = await channel.messages.fetch({ around: messageid, limit: 1 });
            const m = messages.get(messageid);
            if (!m) continue;

            const embed = new MessageEmbed()
                .setColor("RANDOM")
                .addField("\u200b", m.content || "No content (probably an embed)")
                .addField(
                    "\u200b",
                    `[Jump to Message](https://discordapp.com/channels/${m.guild?.id}/${m.channel.id}/${m.id})`
                );
            embed.setAuthor(m.member ? m.member.displayName : m.author.username);
            embed.setThumbnail(m.author.displayAvatarURL({ size: 128 }));

            await findingMessage.delete();
            await msg.channel.send({ embed: embed });
            return;
        }

        // Didn't find the message
        throw new CommandError("Unable to find that message.");
    }
});
