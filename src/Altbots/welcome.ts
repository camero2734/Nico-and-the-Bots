import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
    ActionRowBuilder,
    ButtonBuilder,
    Client,
    EmbedBuilder,
    GuildMember,
    AttachmentBuilder,
    MessageComponentInteraction,
    PartialGuildMember,
    Snowflake,
    TextChannel,
    ButtonStyle
} from "discord.js";
import { channelIDs, roles } from "../Configuration/config";
import secrets from "../Configuration/secrets";
import F from "../Helpers/funcs";
import { queries } from "../Helpers/prisma-init";

const ANNOUNCEMENTS_ID = "?announcements";

const emoji = (name: string, id: Snowflake | null = null) => ({
    emoji: { name, id: id as Snowflake }
});

export class SacarverBot {
    client: Client;
    ready: Promise<void>;
    constructor() {
        this.client = new Client({
            intents: [
                "Guilds",
                "DirectMessages",
                "DirectMessageReactions",
                "GuildBans",
                "GuildEmojisAndStickers",
                "GuildMembers",
                "GuildMessages",
                "GuildIntegrations",
                "GuildInvites",
                "GuildPresences",
                "GuildVoiceStates",
                "GuildWebhooks"
            ]
        });
        this.client.login(secrets.bots.sacarver);

        this.ready = new Promise((resolve) => {
            this.client.on("ready", () => resolve());
        });
    }

    async beginWelcomingMembers(): Promise<void> {
        await this.ready; // Wait until the bot is logged in

        this.client.on("guildMemberAdd", (member) => this.welcomeMember(member));

        this.client.on("interaction", (interaction) => {
            if (!interaction.isMessageComponent()) return;
            if (interaction.customId === ANNOUNCEMENTS_ID) return this.giveAnnouncementsRole(interaction);
        });

        this.client.on("guildMemberUpdate", (...data) => this.handleMembershipScreening(...data));
    }

    async getMemberNumber(member: GuildMember): Promise<number> {
        const dbUser = await queries.findOrCreateUser(member.id);

        return await queries.getJoinedNum(dbUser.joinedAt);
    }

    async welcomeMember(member: GuildMember): Promise<void> {
        const welcomeChan = member.guild.channels.cache.get(channelIDs.welcome) as TextChannel;

        const memberNum = await this.getMemberNumber(member);
        console.log(`Member #${memberNum} joined`);

        const attachment = await SacarverBot.generateWelcomeImage({
            avatarUrl: member.user.displayAvatarURL({ extension: "png" }),
            displayName: member.displayName,
            guildMemberCount: member.guild.memberCount,
            memberNum
        });

        const noteworthyChannels = [
            {
                emoji: "📜",
                title: "Rules & Announcements",
                text: `Make sure you've read our server's <#${channelIDs.rules}> and <#${channelIDs.info}> before hopping into anything! You can also check out <#${channelIDs.announcements}> for band/server related news`
            },
            {
                emoji: "💬",
                title: "General chats",
                text: `For the dedicated band chat check out <#${channelIDs.pilotsDiscussion}> and for general discussion, check out <#${channelIDs.hometown}>, <#${channelIDs.slowtown}>, <#${channelIDs.}> and <#${channelIDs.international}>`
            },
            {
                emoji: "🎟️",
                title: "The Clancy World Tour",
                text: `Head over to <#${channelIDs.concertsForum}> to find thread chats for your shows`
            },
            {
                emoji: "<:DEMA:1218335710457757726>",
                title: "Theories and Lore",
                text: `Discuss theories in <#${channelIDs.leakstheories}> and share yours in <#${channelIDs.theoryForum}>`
            },
            {
                emoji: "🎨",
                title: "Creations",
                text: `Check out our community's <#${channelIDs.creations}> and <#${channelIDs.musiccreations}>`
            },
            { emoji: "🤖", title: "Our bots", text: `Use our custom bots in <#${channelIDs.commands}>` },
            {
                emoji: "🥁",
                title: "Tøpfeed",
                text: `Stay up to date with the band's posts in <#${channelIDs.band}>, and get notified if dmaorg.info updates in <#${channelIDs.dmaorg}>. You can sign up for notifications by using the \`/roles topfeed\` command or from <id:customize>`
            }
        ];

        const embed = new EmbedBuilder()
            .setTitle("Welcome to the twenty one pilots Discord server!")
            .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
            .setDescription(
                "Curious to explore the server? We listed some of the most popular channels below for you to check out!\n\nWe make announcements any time something happens with the band or the server - stay up to date by clicking the button at the end of this message.\n"
            )
            .setImage("attachment://welcome.webp");

        embed.addFields([{ name: "\u200b", value: "\u200b" }]);
        for (const { emoji, title, text } of noteworthyChannels) {
            embed.addFields([{ name: `${emoji} ${title}`, value: text }]);
        }

        // Functions
        const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents([
            new ButtonBuilder({
                style: ButtonStyle.Primary,
                label: "Sign up for #announcements",
                customId: ANNOUNCEMENTS_ID,
                ...emoji("📢")
            })
        ]);

        await welcomeChan.send({
            content: member.toString(),
            embeds: [embed],
            files: [attachment],
            components: [actionRow]
        });
    }

    async giveAnnouncementsRole(interaction: MessageComponentInteraction): Promise<void> {
        const member = interaction.member as GuildMember;
        if (!member) return;

        member.roles.add(roles.announcements);

        await interaction.reply({
            embeds: [
                new EmbedBuilder({
                    description: `You now have the announcements role! You can remove this at any time by using the \`/roles announcements\` command in <#${channelIDs.commands}>`
                })
            ],
            allowedMentions: { repliedUser: false },
            ephemeral: true
        });
    }

    static async generateWelcomeImage({
        avatarUrl,
        displayName,
        guildMemberCount,
        memberNum
    }: {
        avatarUrl: string,
        displayName: string,
        guildMemberCount: number,
        memberNum: number
    }): Promise<AttachmentBuilder> {
        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext("2d");

        const bg = await loadImage("./src/Assets/images/welcome-card-clancy.png");
        ctx.drawImage(bg, 0, 0, 1000, 500);

        // Avatar
        const avatar = await loadImage(avatarUrl);
        ctx.drawImage(avatar, 102, 91, 160, 160);

        ctx.fillStyle = "#FCE300";
        ctx.fillRect(102, 246, 160, 10)

        // Member name
        const fontFamily = "Clancy, Futura, FiraCode, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#F31717";
        ctx.font = `54px ${fontFamily}`;
        ctx.fillText('welcome', 610, 209);

        const name = displayName.normalize("NFKC").replace(/[^a-zA-Z0-9_ ]/g, "").trim().toLowerCase();
        const fontSize = F.canvasFitText(ctx, canvas, name, fontFamily, { maxWidth: 600, maxFontSize: 45 });

        ctx.fillStyle = "#FCE300";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillText(name, 610, 300);

        // Current member number
        ctx.fillStyle = "#F31717";
        ctx.font = `24px ${fontFamily}`;
        ctx.textAlign = "end";
        ctx.fillText(`Member #${guildMemberCount}`, 920, 432);

        // Original member number (by join date)
        ctx.font = `18px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.fillText(`#${memberNum}`, 180, 300);

        return new AttachmentBuilder(canvas.toBuffer('image/webp', 100), { name: "welcome.webp" });
    }

    async handleMembershipScreening(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (oldMember.pending && !newMember.pending) {
            await newMember.roles.add(roles.banditos);
            await newMember.roles.add(roles.new);
        }
    }
}
