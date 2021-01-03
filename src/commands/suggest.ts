import { channelIDs } from "configuration/config";
import { Command, CommandMessage } from "configuration/definitions";
import { Item } from "database/entities/Item";
import { MessageEmbed, TextChannel } from "discord.js";
import { MessageTools } from "helpers";
import { Connection } from "typeorm";

export default new Command({
    name: "suggest",
    description: "Submits a suggestion to the staff",
    category: "Info",
    aliases: ["suggestion"],
    usage: "!suggest [something]",
    example: "!suggest Add a command that gives everyone $1 million",
    async cmd(msg: CommandMessage, connection: Connection): Promise<void> {
        const channel = msg.guild.channels.cache.get(channelIDs.submittedsuggestions) as TextChannel;
        const embed = new MessageEmbed().setColor("RANDOM");
        const member = await msg.member.fetch();

        if (!channel) throw new Error("Suggestions channel not found");

        const title = msg.argsString;

        const entry = new Item({ id: member.id, type: "Suggestion", title, data: "0" });

        embed.setTitle("New suggestion submitted");
        embed.setAuthor(member.displayName, member.user.displayAvatarURL());
        embed.setFooter((msg.channel as TextChannel).name + " | " + new Date(entry.time).toString());
        embed.setDescription(title);

        await connection.manager.save(entry);

        await channel.send(embed);
        await msg.channel.send(MessageTools.textEmbed("Your suggestion has been submitted!"));
    }
});
