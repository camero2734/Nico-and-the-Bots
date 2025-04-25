import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, roleMention } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import { cron, songBattleCron, updateCurrentSongBattleMessage, updatePreviousSongBattleMessage } from "../../scheduled/songbattle";
import { client } from "../../../../app";

const command = new SlashCommand({
    description: "Test command",
    options: [{
        name: "num",
        description: "Number of times to test",
        required: true,
        type: ApplicationCommandOptionType.Integer
    }, {
        name: "test",
        description: "Test",
        required: false,
        type: ApplicationCommandOptionType.String
    }]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await ctx.deferReply({ ephemeral: true });

    const roles = await ctx.guild.roles.fetch();
    const withColor = roles.filter(r => r.hexColor.toLowerCase() === "#ffc6d5");
    if (ctx.opts.num === 1) {
        const button = new ButtonBuilder()
            .setLabel("Test button")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(genTestId({ num: '4' }));

        const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(button);

        await ctx.editReply({ content: "Test", components: [actionRow] });
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
    } else if (ctx.opts.num === 422) {
        if (!ctx.opts.test) throw new CommandError("Test is required");
        const decoded = JSON.parse(ctx.opts.test);

        const r: any = await client.rest.post(`/channels/${ctx.channel.id}/messages`, {
            body: decoded,
        });

        await ctx.channel.messages.fetch(r?.id);
    } else if (ctx.opts.num === 433) {
        songBattleCron();
    } else if (ctx.opts.num === 444) {
        await ctx.channel.send({
            poll: {
                question: {
                    text: "Test poll",
                },
                answers: [
                    { text: "Option 1", emoji: "👍" },
                    { text: "Option 2", emoji: "👎" },
                ],
                duration: 24,
                allowMultiselect: false,
            }
        })
    } else {
        const msg = withColor.map(x => roleMention(x.id)).join("\n");

        await ctx.editReply(msg);
    }
});

const genTestId = command.addInteractionListener("testCommandBtn", ["num"], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    throw new Error("Test error");
});

export default command;
