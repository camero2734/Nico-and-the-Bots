import { EmbedBuilder } from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { calculateHistory, fromSongId } from "../../scheduled/songbattle.consts";

const command = new SlashCommand({
    description: "Test command for song battles",
    options: []
});

command.setHandler(async (ctx) => {
    await ctx.deferReply({ ephemeral: true })

    if (ctx.user.id !== userIDs.me) throw new CommandError("No.");

    const { sorted } = await calculateHistory();

    const embed = new EmbedBuilder()
        .setTitle("Song Battle Stats")
        .setColor("Blurple");

    for (let i = 0; i < 10; i++) {
        const round = i + 1;
        const matchingSongs = sorted.filter(x => x[1].rounds === i);

        if (matchingSongs.length === 0) continue;
        embed.addFields({
            name: `Round ${round}`,
            value: matchingSongs.map(x => {
                const { song, album } = fromSongId(x[0]);
                return `${song.name} - ${album.name}`;
            }).join("\n"),
        })
    }

    await ctx.editReply({ embeds: [embed] });
});

export default command;
