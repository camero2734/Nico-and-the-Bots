/**
 * Manages things that are scheduled in the database (reminders, mutes, etc.)
 */

import { secondsToMilliseconds } from "date-fns";
import {
    Client,
    Collection,
    Guild,
    GuildMember,
    MessageEmbed,
    MessageOptions,
    Snowflake,
    VoiceChannel
} from "discord.js";
import { channelIDs, guildID, roles } from "../Configuration/config";
import F from "./funcs";
import { rollbar } from "./logging/rollbar";
import { prisma } from "./prisma-init";

const CHECK_INTERVAL = secondsToMilliseconds(10);

export default async function (client: Client): Promise<void> {
    const guild = await client.guilds.fetch(guildID);

    async function runChecks() {
        await checkMutes(guild);
        await checkReminders(guild);
        await checkMemberRoles(guild);
        await checkVCRoles(guild);
        await F.wait(CHECK_INTERVAL);
        runChecks();
    }
    runChecks();
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

    const successfulUnmuteIds: number[] = [];
    for (const mute of finishedMutes) {
        try {
            const member = await guild.members.fetch(mute.mutedUserId.toSnowflake());

            // Remove timeout, give back Banditos role
            await member.roles.remove(roles.muted);
            await member.roles.add(roles.banditos);

            const embed = new MessageEmbed({ description: "Your mute has ended." });
            tryToDM(member, { embeds: [embed] });

            successfulUnmuteIds.push(mute.id);
        } catch (e) {
            console.log(e, /UNABLE_TO_UNMUTE/);
        }
    }

    await prisma.mute.updateMany({
        where: { id: { in: successfulUnmuteIds } },
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
    const allMembers = await guild.members.fetch();
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
    try {
        const allChannels = await guild.channels.fetch();
        const allMembers = await guild.members.fetch();

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
    } catch (e) {
        if (e instanceof Error) rollbar.error(e);
        else rollbar.error(`Error in updating VC roles`);
    }
}
