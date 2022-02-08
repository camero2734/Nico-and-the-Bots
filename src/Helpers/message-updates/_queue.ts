import { Queue, QueueScheduler, Worker } from "bullmq";
import { minutesToMilliseconds } from "date-fns";
import { Collection, Message, MessageOptions, Snowflake, TextChannel } from "discord.js";
import IORedis from "ioredis";
import { NicoClient } from "../../../app";
import { guildID } from "../../Configuration/config";
import { rollbar } from "../logging/rollbar";
import { prisma } from "../prisma-init";
import { UpdateProgress } from "./update-progress";

const QUEUE_NAME = "MessageUpdates";
const redisOpts = { connection: new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false }) };

export const scheduler = new QueueScheduler(QUEUE_NAME, redisOpts);

export interface MessageUpdate {
    name: string;
    initialMessage: () => Promise<MessageOptions>;
    update: (msg: Message) => Promise<void>;
    channelId: Snowflake;
    intervalMinutes?: number;
}

const queue = new Queue(QUEUE_NAME, {
    ...redisOpts,
    defaultJobOptions: {
        removeOnFail: true,
        removeOnComplete: true
    }
});

const messageUpdates = new Collection<string, MessageUpdate>();

const registerMessageUpdate = async (msgUpdate: MessageUpdate) => {
    console.log(`Registering ${msgUpdate.name}`);

    const intervalMinutes = msgUpdate.intervalMinutes || 2;
    await queue.add(msgUpdate.name, "", { repeat: { every: minutesToMilliseconds(intervalMinutes) } });

    messageUpdates.set(msgUpdate.name, msgUpdate);
};
//
// registerMessageUpdate(UpdateProgress);

//

new Worker(
    QUEUE_NAME,
    async (job) => {
        try {
            const messageUpdate = messageUpdates.get(job.name);
            if (!messageUpdate) {
                return job.discard();
            }

            const msg = await findOrCreateMessage(job.name, messageUpdate);
            await messageUpdate.update(msg);
        } catch (e) {
            if (e instanceof Error) rollbar.error(e);
            else rollbar.error(`Queue error: ${e}`);
        }
    },
    redisOpts
);

async function findOrCreateMessage(name: string, messageUpdate: MessageUpdate): Promise<Message> {
    const msgRef = await prisma.messageReference.findUnique({ where: { name } });
    const channel = await getChannel(messageUpdate.channelId);

    if (msgRef) {
        const m = await channel.messages.fetch(msgRef.messageId).catch(() => null);
        if (!m) {
            await prisma.messageReference.delete({ where: { name } });
        } else return m;
    }

    const m = await channel.send(await messageUpdate.initialMessage());
    await prisma.messageReference.create({ data: { messageId: m.id, channelId: m.channel.id, name } });
    return m;
}

async function getChannel(channelId: Snowflake) {
    const guild = await NicoClient.guilds.fetch(guildID);
    const channel = await guild?.channels.fetch(channelId);

    if (!channel) throw new Error("Channel not found");

    return channel as TextChannel;
}
