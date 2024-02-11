import { createCanvas, loadImage } from "canvas";
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

        const attachment = await this.generateWelcomeImage(member, memberNum);

        const noteworthyChannels = [
            {
                emoji: "📜",
                title: "Rules & Announcements",
                text: `Make sure you've read our server's <#${channelIDs.rules}> before hopping into anything! You can also check out <#${channelIDs.announcements}> for band/server related announcements.`
            },
            {
                emoji: "🏠",
                title: "General chats",
                text: `For general discussion, check out <#${channelIDs.hometown}> and <#${channelIDs.slowtown}>`
            },
            { emoji: "🤖", title: "Our bots", text: `Use our custom bots in <#${channelIDs.commands}>` },
            {
                emoji: "<:THEORY:404458118299254785>",
                title: "Theories",
                text: `Discuss theories in <#${channelIDs.leakstheories}> and share yours in <#${channelIDs.theorylist}>`
            },
            {
                emoji: "🧑‍🎨",
                title: "Creations",
                text: `Check out our community's <#${channelIDs.creations}> and <#${channelIDs.mulberrystreet}>`
            },
            {
                emoji: "🥁",
                title: "Topfeed",
                text: `Stay up to date with the band's posts in <#${channelIDs.band}>, and get notified if dmaorg.info updates in <#${channelIDs.dmaorg}>. You can sign up for notifications by using the \`/roles topfeed\` command.`
            }
        ];

        const embed = new EmbedBuilder()
            .setTitle("Welcome to the twenty one pilots Discord server!")
            .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
            .setDescription(
                "Curious to explore the server? We listed some of the most popular channels below for you to check out!\n\nWe make announcements any time something happens with the band or the server - stay up to date by clicking the button at the end of this message.\n"
            )
            .setImage("attachment://welcome.png");

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

    async generateWelcomeImage(member: GuildMember, memberNum: number | string): Promise<AttachmentBuilder> {
        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext("2d");

        const bg = await loadImage("./src/Assets/images/welcome-card.png");

        ctx.drawImage(bg, 0, 0, 1000, 500);

        // Avatar
        ctx.translate(0, 88);
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: "png" }));
        ctx.drawImage(avatar, 104, 0, 144, 144);

        // Member name
        ctx.translate(0, 197);

        ctx.fillStyle = "white";
        ctx.shadowColor = "#EF89AE";
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        const name = member.displayName.normalize("NFKC");
        const fontSize = F.canvasFitText(ctx, canvas, name, "Futura", { maxWidth: 600, maxFontSize: 64 });
        ctx.font = `${fontSize}px Futura`;
        ctx.fillText(name, 300, 0);

        // Current member number
        ctx.translate(0, 130);
        ctx.shadowColor = "#55A4B5";
        ctx.font = "42px Futura";
        ctx.textAlign = "end";
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillText(`Member #${member.guild.memberCount}`, 925, 0);

        // Original member number (by join date)
        ctx.translate(0, 40);
        ctx.font = "24px Futura";
        ctx.textAlign = "center";
        ctx.fillText(`#${memberNum}`, 155, 0);

        return new AttachmentBuilder(canvas.toBuffer(), { name: "welcome.png" });
    }

    async handleMembershipScreening(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (oldMember.pending && !newMember.pending) {
            await newMember.roles.add(roles.banditos);
            await newMember.roles.add(roles.new);
        }
    }
}
