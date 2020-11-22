import { DiscordAPIError, Message, MessageEmbed, TextChannel, User } from "discord.js";

export const MessageTools = {
    getMentionedUser(msg: Message): User | null {
        const user = msg.mentions?.users?.first() || null;
        return user;
    },
    textEmbed(text: string): MessageEmbed {
        const embed = new MessageEmbed();
        embed.setDescription(text);
        embed.setColor("RANDOM");
        return embed;
    }
};
