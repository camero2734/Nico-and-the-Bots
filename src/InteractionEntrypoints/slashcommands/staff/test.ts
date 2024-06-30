import { ApplicationCommandOptionType, roleMention } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import { cron, updateCurrentSongBattleMessage, updatePreviousSongBattleMessage } from "../../scheduled/songbattle";

const command = new SlashCommand({
    description: "Test command",
    options: [{
        name: "num",
        description: "Number of times to test",
        required: true,
        type: ApplicationCommandOptionType.Integer
    }]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await ctx.deferReply({ ephemeral: true });

    const roles = await ctx.guild.roles.fetch();
    const withColor = roles.filter(r => r.hexColor.toLowerCase() === "#ffc6d5");
    if (ctx.opts.num === 1) {
        const songs =
            `
Overcompensate
Next Semester
Backslide
Midwest Indigo
Vignette
Lavish
Navigating
Snap Back
Paladin Strait

Choker
Shy Away
The Outside
Saturday
Mulberry Street
No Chances
Redecorate

Jumpsuit
Levitate
Morph
Chlorine
Nico and the Niners
Cut My Lip
Pet Cheetah

Heavydirtysoul
Fairly Local
Lane Boy
Message Man
Hometown
Goner

Ode to Sleep
Holding on to You
Migraine
Car Radio
Guns for Hands
Trees

Forest
Kitchen Sink
Anathema
Lovely
Ruby
Clear

Fall Away
Addict With A Pen
Friend, Please
Trapdoor
Taxi Cab
Isle of Flightless Birds
`.trim().split(/\n{1,}/g);

        const guildRoles = await ctx.guild.roles.fetch();
        let msg = "";
        for (const song of songs) {
            if (!song) continue;
            const title = song.trim();
            const role = guildRoles.find(r => r.name === title);
            if (!role) {
                await ctx.editReply(`Creating role for ${title}`);
                const newRole = await ctx.guild.roles.create({
                    name: title,
                });
                msg += `NEW: ${song}: ${newRole.id}\n`;
            } else {
                await ctx.editReply(`Role for ${title} already exists`);
                msg += `${song}: ${role.id}\n`;
            }

            await F.wait(500);
        }

        await ctx.editReply(msg);
    } else if (ctx.opts.num === 2) {
        await updateCurrentSongBattleMessage();
    } else if (ctx.opts.num === 3) {
        await updatePreviousSongBattleMessage(1);
    } else if (ctx.opts.num === 42) {
        for (const role of withColor.values()) {
            await role.delete();
        }

        await ctx.editReply("Done");
    } else if (ctx.opts.num === 69) {
        const concertChannelManager = getConcertChannelManager(ctx.guild);
        await concertChannelManager.initialize();
        await concertChannelManager.checkChannels();
        await ctx.editReply("Done checking concert channels");
    } else if (ctx.opts.num === 420) {
        // songBattleCron();
        const nextRun = cron.nextRun();
        if (!nextRun) throw new CommandError("Next run is null");

        const timeStamp = F.discordTimestamp(nextRun, "relative");
        await ctx.editReply(`Next run: ${timeStamp} (\`${timeStamp}\`)`);
    } else {
        const msg = withColor.map(x => roleMention(x.id)).join("\n");

        await ctx.editReply(msg);
    }
});

export default command;
