import { Message, MessageEmbed, MessageOptions } from "discord.js";
import { FooterEncoder } from "./_footer-encoder";
import { MessageUpdate } from "./_queue";

interface FooterData {
    count: number;
}

const footerEncoder = new FooterEncoder<FooterData>({ count: 0 });

const initialMessage = async (): Promise<MessageOptions> => {
    const embed = new MessageEmbed() //
        .setTitle("This is a test")
        .setDescription("0/100")
        .setFooter(footerEncoder.encode({ count: 0 }));

    return {
        embeds: [embed]
    };
};

const update = async (msg: Message) => {
    const embed = msg.embeds[0];
    const footerText = embed.footer?.text as string;
    const footerData = footerEncoder.decode(footerText);
    footerData.count += 1;

    embed.setDescription(`${footerData.count}/100`);
    embed.setFooter(footerEncoder.encode(footerData));

    await msg.edit({ embeds: [embed] });
};

export const UpdateProgress = {
    name: "update-progress",
    initialMessage,
    update,
    channelId: "859592952108285992",
    intervalMinutes: 0.5
} as MessageUpdate;
