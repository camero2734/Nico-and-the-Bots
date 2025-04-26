import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  roleMention
} from "discord.js";
import { userIDs } from "../../../Configuration/config";
import { CommandError } from "../../../Configuration/definitions";
import F from "../../../Helpers/funcs";
import { SlashCommand } from "../../../Structures/EntrypointSlashCommand";
import { getConcertChannelManager } from "../../scheduled/concert-channels";
import {
  cron,
  songBattleCron,
  updateCurrentSongBattleMessage,
  updatePreviousSongBattleMessage
} from "../../scheduled/songbattle";

const command = new SlashCommand({
    description: "Test command",
    options: [
        {
            name: "num",
            description: "Number of times to test",
            required: true,
            type: ApplicationCommandOptionType.Integer
        }
    ]
});

command.setHandler(async (ctx) => {
    if (ctx.user.id !== userIDs.me) return;

    await ctx.deferReply({ ephemeral: true });

    const roles = await ctx.guild.roles.fetch();
    const withColor = roles.filter((r) => r.hexColor.toLowerCase() === "#ffc6d5");
    if (ctx.opts.num === 1) {
        const button = new ButtonBuilder()
            .setLabel("Test button")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(genTestId({ num: "4" }));

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
        const a = new ContainerBuilder({
            components: [
                {
                    type: ComponentType.TextDisplay,
                    content: "# Battle #3 / 40\n-# Blurryface 10th Anniversary Song Battles"
                },
                { type: ComponentType.Separator, divider: false, spacing: 1 },
                {
                    type: ComponentType.Section,
                    components: [
                        { type: ComponentType.TextDisplay, content: "**Message Man**" },
                        { type: ComponentType.TextDisplay, content: "*Blurryface*" },
                        {
                            type: ComponentType.TextDisplay,
                            content: "<:youtube:1365419055594606592>[YouTube](https://youtube.com) | 🏅x2"
                        }
                    ],
                    accessory: {
                        type: ComponentType.Thumbnail,
                        media: {
                            url: "https://images.squarespace-cdn.com/content/v1/58ab2fce20099e7487a18b2a/1488423618745-3IDAU928ZPC21H89CEGN/Blurryface-twenty-one-pilots-cover-art.png?format=2500w"
                        },
                        description: "Album cover for Blurryface"
                    }
                },
                {
                    type: ComponentType.Separator,
                    divider: true,
                    spacing: 2
                },
                {
                    type: ComponentType.Section,
                    components: [
                        { type: ComponentType.TextDisplay, content: "**Ride (feat. MUTEMATH)**" },
                        { type: ComponentType.TextDisplay, content: "*TOPxMM*" },
                        {
                            type: ComponentType.TextDisplay,
                            content: "<:youtube:1365419055594606592>[YouTube](https://youtube.com) | 🏅x1"
                        }
                    ],
                    accessory: {
                        type: ComponentType.Thumbnail,
                        media: {
                            url: "https://i.scdn.co/image/ab67616d00001e02aa53cf116c616b262b59742a"
                        },
                        description: "Album cover for TOPxMM"
                    }
                },
                {
                    type: ComponentType.Separator,
                    divider: true,
                    spacing: 1
                },
                { type: ComponentType.TextDisplay, content: "Which song wins this round?" },
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            label: "Message Man",
                            custom_id: "vote_song_1",
                            emoji: {
                                id: "833130087943634944"
                            }
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            label: "Ride (feat. MUTEMATH)",
                            custom_id: "vote_song_2",
                            emoji: {
                                id: "1363199884051878109"
                            }
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Secondary,
                            label: "What is this?",
                            custom_id: "battle_info",
                            emoji: {
                                id: "1365428431122071583"
                            }
                        }
                    ]
                }
            ]
        });

        await ctx.channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [a],
        })
    } else if (ctx.opts.num === 433) {
        songBattleCron();
    } else if (ctx.opts.num === 444) {
        await ctx.channel.send({
            poll: {
                question: {
                    text: "Test poll"
                },
                answers: [
                    { text: "Option 1", emoji: "👍" },
                    { text: "Option 2", emoji: "👎" }
                ],
                duration: 24,
                allowMultiselect: false
            }
        });
    } else {
        const msg = withColor.map((x) => roleMention(x.id)).join("\n");

        await ctx.editReply(msg);
    }
});

const genTestId = command.addInteractionListener("testCommandBtn", ["num"], async (ctx) => {
    await ctx.deferReply({ ephemeral: true });

    throw new Error("Test error");
});

export default command;
