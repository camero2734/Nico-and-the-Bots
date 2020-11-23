import { APIMessageContentResolvable, Message, MessageEmbed, TextChannel, User } from "discord.js";

export interface TimedMessage {
    // The thing to send
    content: APIMessageContentResolvable | MessageEmbed;
    // Time to wait before sending this message (in ms)
    waitBefore: number;
}

export const MessageTools = {
    getMentionedUser(msg: Message): User | null {
        const user = msg.mentions?.users?.first() || null;
        return user;
    },
    textEmbed(text: string, color?: string): MessageEmbed {
        const embed = new MessageEmbed();
        embed.setDescription(text);
        embed.setColor(color || "RANDOM");
        return embed;
    },
    async timeMessages(channel: TextChannel, msgs: TimedMessage[], sendSeparate = false): Promise<void> {
        let prevMessage = (null as unknown) as Message;
        for (const msg of msgs) {
            await new Promise((resolve) => setTimeout(resolve, msg.waitBefore));
            if (sendSeparate || !prevMessage) {
                prevMessage = await channel.send(msg.content);
            } else {
                prevMessage.edit(msg.content);
            }
        }
    }
};
