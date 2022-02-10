/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import {
    addMilliseconds,
    compareAsc,
    differenceInHours,
    format,
    hoursToMilliseconds,
    secondsToMilliseconds,
    startOfDay,
    subDays,
    subMinutes
} from "date-fns";
import { isBefore } from "date-fns/fp";
import {
    Client,
    Collection,
    Guild,
    GuildMember,
    Embed,
    MessageOptions,
    Snowflake,
    TextChannel,
    VoiceChannel,
    ChannelType
} from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import SeedRandom from "seed-random";
import { dropEmojiGuildId, guildID, roles } from "../Configuration/config";
import secrets from "../Configuration/secrets";
import { NUM_DAYS_FOR_CERTIFICATION, NUM_GOLDS_FOR_CERTIFICATION } from "../InteractionEntrypoints/contextmenus/gold";
import { sendToStaff } from "../InteractionEntrypoints/slashcommands/apply/firebreathers";
import F from "./funcs";
import { rollbar } from "./logging/rollbar";
import { prisma } from "./prisma-init";

const safeCheck = async (p: Promise<unknown>) => {
    try {
        await p;
    } catch (e) {
        if (e instanceof Error) rollbar.error(e);
        else rollbar.error(`Error: ${e}`);
    }
};

export default async function (client: Client): Promise<void> {
    const guild = await client.guilds.fetch(guildID);

    const doc = new GoogleSpreadsheet("1M63thXZZLKUc-3Y0IZmCLRYK2BsaFbAs_0P1xSeVRd0");
    await doc.useServiceAccountAuth({
        client_email: secrets.apis.google.sheets.client_email,
        private_key: secrets.apis.google.sheets.private_key
    });

    async function every5Seconds() {
        await safeCheck(checkMutes(guild));
        await safeCheck(checkReminders(guild));
        await safeCheck(checkMemberRoles(guild));
        await safeCheck(checkVCRoles(guild));

        await F.wait(secondsToMilliseconds(5));
        every5Seconds();
    }

    async function every30Seconds() {
        await safeCheck(checkHouseOfGold(guild));
        await safeCheck(checkFBApplication(guild, doc));

        await F.wait(secondsToMilliseconds(30));
        every30Seconds();
    }

    async function every60Seconds() {
        await safeCheck(checkDropTrigger());
        await safeCheck(deleteOldDrops(guild));

        await F.wait(secondsToMilliseconds(60));
        every60Seconds();
    }

    every5Seconds();
    every30Seconds();
    every60Seconds();
}

async function tryToDM(member: GuildMember, msg: MessageOptions): Promise<void> {
    try {
        const dm = await member.createDM();
        await dm.send(msg);
    } catch (e) {
        console.log(e, /UNABLE_TO_DM/);
    }
}

async function checkMutes(guild: Guild): Promise<void> {
    const finishedMutes = await prisma.mute.findMany({
        where: { endsAt: { lte: new Date() }, finished: false }
    });

    for (const mute of finishedMutes) {
        try {
            const member = await guild.members.fetch(mute.mutedUserId.toSnowflake());

            // Remove timeout, give back Banditos role
            await member.roles.remove(roles.muted);
            await member.roles.add(roles.banditos);

            const embed = new Embed({ description: "Your mute has ended." });
            tryToDM(member, { embeds: [embed] });
        } catch (e) {
            console.log(e, mute.mutedUserId, /UNABLE_TO_UNMUTE/);
        }
    }

    const fetchedIds = finishedMutes.map((r) => r.id);
    await prisma.mute.updateMany({
        where: { id: { in: fetchedIds } },
        data: { finished: true }
    });
}

async function checkReminders(guild: Guild): Promise<void> {
    const finishedReminders = await prisma.reminder.findMany({ where: { sendAt: { lte: new Date() } } });

    for (const rem of finishedReminders) {
        try {
            const member = await guild.members.fetch(rem.userId as Snowflake);

            const dm = await member.createDM();
            const embed = new Embed().setTitle("Your Reminder").setDescription(rem.text).setTimestamp(rem.createdAt);

            await dm.send({ embeds: [embed] });
        } catch (e) {
            console.log(e, /UNABLE_TO_SEND_REMINDER/);
        }
    }

    // Remove them all, regardless of whether they were sent
    const fetchedIds = finishedReminders.map((r) => r.id);
    await prisma.reminder.deleteMany({ where: { id: { in: fetchedIds } } });
}

async function checkMemberRoles(guild: Guild): Promise<void> {
    // Add banditos/new to members who pass membership screening
    const allMembers = guild.members.cache;
    const membersNoBanditos = allMembers.filter(
        (mem) =>
            !mem.roles.cache.has(roles.banditos) &&
            !mem.roles.cache.has(roles.muted) &&
            !mem.roles.cache.has(roles.hideallchannels) &&
            !mem.pending
    );

    for (const mem of membersNoBanditos.values()) {
        await mem.roles.add(roles.banditos);
        await mem.roles.add(roles.new);
    }

    // Remove new from members who have been in the server long enough
    const NUM_HOURS_STAY_NEW = 6;
    const membersToRemoveNew = allMembers.filter((mem) => {
        if (!mem.roles.cache.has(roles.new) || !mem.joinedAt || mem.pending) return false;
        return differenceInHours(new Date(), mem.joinedAt) >= NUM_HOURS_STAY_NEW;
    });

    for (const mem of membersToRemoveNew.values()) {
        await mem.roles.remove(roles.new);
    }
}

async function checkVCRoles(guild: Guild): Promise<void> {
    const allChannels = await guild.channels.fetch();
    const allMembers = guild.members.cache;

    const voiceChannels = allChannels.filter((c): c is VoiceChannel => c.type === ChannelType.GuildVoice);

    const membersInVc = new Collection<Snowflake, GuildMember>();

    for (const vc of voiceChannels.values()) {
        for (const member of vc.members.values()) {
            membersInVc.set(member.id, member);
        }
    }

    const membersWithVcRoleArr = allMembers.filter((m) => m.roles.cache.has(roles.vc));
    const membersWithVcRole = new Collection(membersWithVcRoleArr.map((m) => [m.id, m]));

    const toAdd = membersInVc.filter((m) => !membersWithVcRole.has(m.id));
    const toRemove = membersWithVcRole.filter((m) => !membersInVc.has(m.id));

    for (const mem of toAdd.values()) {
        await mem.roles.add(roles.vc);
    }

    for (const mem of toRemove.values()) {
        await mem.roles.remove(roles.vc);
    }
}

async function checkHouseOfGold(guild: Guild): Promise<void> {
    const msgsToDelete = await prisma.gold.groupBy({
        by: ["houseOfGoldMessageUrl"],
        _count: true,
        _min: {
            createdAt: true
        },
        having: {
            houseOfGoldMessageUrl: {
                _count: { lt: NUM_GOLDS_FOR_CERTIFICATION }
            },
            createdAt: {
                _min: { lt: subDays(new Date(), NUM_DAYS_FOR_CERTIFICATION) }
            }
        },
        where: {
            houseOfGoldMessageUrl: { not: null }
        }
    });

    for (const toDelete of msgsToDelete) {
        try {
            console.log(`DELETING ${toDelete.houseOfGoldMessageUrl}`);
            const ids = F.parseMessageUrl(toDelete.houseOfGoldMessageUrl as string);

            if (!ids) continue;

            try {
                const channel = (await guild.channels.fetch(ids.channelId)) as TextChannel;
                const message = await channel.messages.fetch(ids.messageId);

                await message.delete();
            } catch {
                /** Message already deleted probably  */
            }

            await prisma.gold.updateMany({
                where: { houseOfGoldMessageUrl: toDelete.houseOfGoldMessageUrl },
                data: { houseOfGoldMessageUrl: null }
            });
        } catch (e) {
            console.log(e, /UNABLE_TO_DELETE_HOG/);
        }
    }
}

async function checkFBApplication(guild: Guild, doc: GoogleSpreadsheet): Promise<void> {
    console.log("Running FB check");
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    const rows = await sheet.getRows();
    const ApplicationIdKey = "Application ID";

    const _lookingForIds = await prisma.firebreatherApplication.findMany({
        where: { submittedAt: null },
        select: { applicationId: true }
    });
    const lookingForIds = new Set(_lookingForIds.map((l) => l.applicationId));

    for (const row of rows) {
        const applicationId = row[ApplicationIdKey];

        if (!lookingForIds.has(applicationId)) continue;
        lookingForIds.delete(applicationId); // Ignore any resubmissions

        const keys = Object.keys(row).filter((k) => !k.startsWith("_") && k !== ApplicationIdKey);

        const jsonData = Object.fromEntries(keys.map((k) => [k, row[k]]));

        // Send to Discord
        const messageUrl = await sendToStaff(guild, applicationId, jsonData);
        if (!messageUrl) continue;

        // Save to DB
        await prisma.firebreatherApplication.update({
            where: { applicationId },
            data: { submittedAt: new Date(), messageUrl, responseData: jsonData }
        });
    }
}

async function deleteOldDrops(guild: Guild): Promise<void> {
    // Delete drops from yesterday
    const cutoff = startOfDay(new Date());
    const { count: deletedCount } = await prisma.randomDrop.deleteMany({ where: { createdAt: { lte: cutoff } } });

    if (deletedCount > 0) {
        // Delete previous day emojis
        const emojiGuild = await guild.client.guilds.fetch(dropEmojiGuildId);
        const emojis = await emojiGuild.emojis.fetch();
        for (const emoji of emojis.values()) {
            if (emoji.name?.startsWith("drop")) {
                await emoji.delete();
                await F.wait(750);
            }
        }
    }
}

async function checkDropTrigger(): Promise<void> {
    const NUM_DROPS = 3;

    const now = new Date();
    const epoch = startOfDay(now);
    const rand = SeedRandom(`${secrets.randomSeedPrefix}${epoch}`);

    const timeOffset = () => rand() * hoursToMilliseconds(16) + hoursToMilliseconds(6); // 06:00 - 22:00 CT

    const todaysDropsOffsets = F.indexArray(NUM_DROPS).map(timeOffset);
    const todaysDrops = todaysDropsOffsets.map((ms) => addMilliseconds(epoch, ms)).sort(compareAsc);

    const expectedPreviousDrops = todaysDrops.filter(isBefore(now)).length;

    const actualPreviousDrops = await prisma.randomDrop.count({
        where: {
            createdAt: {
                lte: now,
                gte: epoch
            }
        }
    });

    if (actualPreviousDrops >= NUM_DROPS) return;

    if (actualPreviousDrops < expectedPreviousDrops) {
        console.log(todaysDrops.map((d) => format(d, "d MMMM yyyy HH:mm:ss")));
        console.log({ expectedPreviousDrops, actualPreviousDrops });
    }
}
