import { differenceInMilliseconds, parse } from "date-fns";
import { Message, MessageEmbed, MessageOptions } from "discord.js";
import progressBar from "string-progressbar";
import { channelIDs, emojiIDs } from "../../Configuration/config";
import F from "../funcs";
import { MessageUpdate } from "./_queue";

const startDate = parse("02 October 2021 12:00", "dd MMMM yyyy HH:mm", new Date());
const endDate = parse("02 October 2021 17:00", "dd MMMM yyyy HH:mm", new Date());

const toEmoji = (id: string) => `<:name:${id}>`;
const startEmoji = toEmoji(emojiIDs.poll.start);
const filledEmoji = toEmoji(emojiIDs.poll.filled);
const emptyEmoji = toEmoji(emojiIDs.poll.empty);
const endEmoji = toEmoji(emojiIDs.poll.end);

const generateProgressBar = (): [string, boolean] => {
    const now = new Date();
    const elapsedTime = differenceInMilliseconds(now, startDate);
    const totalTime = differenceInMilliseconds(endDate, startDate);

    console.log(elapsedTime, totalTime);

    const [progress] = progressBar.filledBar(totalTime, elapsedTime, 8, emptyEmoji, filledEmoji);
    return [`${startEmoji}${progress}${endEmoji}\u200b`, elapsedTime > totalTime];
};

const standardizeEmbed = (embed: MessageEmbed): void => {
    embed.fields = [];
    embed
        .setAuthor("DEMAtronix™ Telephony System", "https://i.imgur.com/csHALvp.png")
        .setColor("#7289DA")
        .addField("Performing system upgrade...", `Expected to finish ${F.discordTimestamp(endDate, "relative")}`)
        .setFooter("Last updated")
        .setTimestamp(new Date());
};

const initialMessage = async (): Promise<MessageOptions> => {
    const [progress] = generateProgressBar();

    const embed = new MessageEmbed().setDescription(progress);
    standardizeEmbed(embed);

    return {
        embeds: [embed]
    };
};

const update = async (msg: Message) => {
    const [progress, isDone] = generateProgressBar();

    if (!isDone) {
        const embed = msg.embeds[0];
        embed.setDescription(progress);
        standardizeEmbed(embed);

        await msg.edit({ embeds: [embed] });
    } else {
        // TODO
    }
};

export const UpdateProgress = {
    name: "update-progress",
    initialMessage,
    update,
    channelId: channelIDs.announcements,
    intervalMinutes: 0.5
} as MessageUpdate;
