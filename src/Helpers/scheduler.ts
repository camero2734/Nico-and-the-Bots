/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import { secondsToMilliseconds, subDays } from "date-fns";
import {
    Client,
    Collection,
    Guild,
    GuildMember,
    MessageEmbed,
    MessageOptions,
    Snowflake,
    TextChannel,
    VoiceChannel
} from "discord.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { guildID, roles } from "../Configuration/config";
import secrets from "../Configuration/secrets";
import { NUM_DAYS_FOR_CERTIFICATION, NUM_GOLDS_FOR_CERTIFICATION } from "../InteractionEntrypoints/contextmenus/gold";
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

    async function run5SecChecks() {
        await safeCheck(checkMutes(guild));
        await safeCheck(checkReminders(guild));
        await safeCheck(checkMemberRoles(guild));
        await safeCheck(checkVCRoles(guild));

        await F.wait(secondsToMilliseconds(5));
        run5SecChecks();
    }

    async function run30SecChecks() {
        await safeCheck(checkHouseOfGold(guild));
        await safeCheck(checkFBApplication(guild, doc));

        await F.wait(secondsToMilliseconds(30));
        run30SecChecks();
    }

    run5SecChecks();
    run30SecChecks();
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

            const embed = new MessageEmbed({ description: "Your mute has ended." });
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
            const embed = new MessageEmbed()
                .setTitle("Your Reminder")
                .setDescription(rem.text)
                .setTimestamp(rem.createdAt);

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
    }
}

async function checkVCRoles(guild: Guild): Promise<void> {
    const allChannels = await guild.channels.fetch();
    const allMembers = guild.members.cache;

    const voiceChannels = allChannels.filter((c): c is VoiceChannel => c.type === "GUILD_VOICE");

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
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    const rows = await sheet.getRows();
    const applicationIdKey = "Application ID";

    const _lookingForIds = await prisma.firebreatherApplication.findMany({
        where: { submittedAt: null },
        select: { applicationId: true }
    });
    const lookingForIds = new Set(_lookingForIds.map((l) => l.applicationId));

    if (Math.random() < 2) return;

    for (const row of rows) {
        const applicationId = row[applicationIdKey];

        if (!lookingForIds.has(applicationId)) continue;
        lookingForIds.delete(applicationId); // Ignore any resubmissions

        const keys = Object.keys(row).filter((k) => !k.startsWith("_"));

        const jsonData = Object.fromEntries(keys.map((k) => [k, row[k]]));

        // Send to Discord

        // Save to DB
        await prisma.firebreatherApplication.update({
            where: { applicationId },
            data: { submittedAt: new Date(), sentToStaff: true }
        });
    }
}
