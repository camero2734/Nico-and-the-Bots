import { Mutex } from "async-mutex";
import { createCanvas } from "canvas";
import { channelIDs, roles } from "configuration/config";
import * as secrets from "configuration/secrets.json";
import { Counter } from "database/entities/Counter";
import {
    Client,
    GuildMember,
    Intents,
    MessageActionRow,
    MessageAttachment,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    Snowflake,
    TextChannel
} from "discord.js";
import { Connection } from "typeorm";

const ANNOUNCEMENTS_ID = "?announcements";

const emoji = (name: string, id: Snowflake | null = null): { emoji: { name: string; id: Snowflake } } => ({
    emoji: { name, id: id as Snowflake }
});

export class SacarverBot {
    client: Client;
    ready: Promise<void>;
    mutex = new Mutex();
    constructor(private connection: Connection) {
        this.client = new Client({ intents: Intents.ALL });
        this.client.login(secrets.bots.sacarver);

        this.ready = new Promise((resolve) => {
            this.client.on("ready", resolve);
        });
    }

    async beginWelcomingMembers(): Promise<void> {
        await this.ready; // Wait until the bot is logged in

        this.client.on("guildMemberAdd", (member) =>
            this.mutex.runExclusive(async () => await this.welcomeMember(member))
        );

        this.client.on("interaction", (interaction) => {
            if (!interaction.isMessageComponent()) return;
            if (interaction.customID === ANNOUNCEMENTS_ID) return this.giveAnnouncementsRole(interaction);
        });
    }

    async welcomeMember(member: GuildMember): Promise<void> {
        const welcomeChan = member.guild.channels.cache.get(channelIDs.welcometest) as TextChannel;

        // Get member number
        const memberCount =
            (await this.connection.getRepository(Counter).findOne({ id: "MemberCount", title: "MemberCount" })) ||
            new Counter({ id: "MemberCount", title: "MemberCount", count: member.guild.memberCount - 1 });

        memberCount.count++;
        await this.connection.manager.save(memberCount);

        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FCE300";
        ctx.fillRect(0, 0, 1000, 500);
        const attachment = new MessageAttachment(canvas.toBuffer(), "welcome.png");

        const noteworthyChannels = [
            {
                emoji: "📜",
                title: "Rules",
                text: `Make sure you've read our server's <#${channelIDs.rules}> before hopping into anything!`
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
                text: `Stay up to date with the band's posts in <#${channelIDs.band}>, and get notified if dmaorg.info updates in <#${channelIDs.dmaorg}>`
            }
        ];

        const embed = new MessageEmbed()
            .setTitle("Welcome to the twenty one pilots Discord server!")
            .setAuthor(member.displayName, member.user.displayAvatarURL())
            .setDescription(
                "Curious to explore the server? We listed some of the most popular channels below for you to check out!\n\nWe make announcements any time something happens with the band or the server - stay up to date by clicking the button at the end of this message.\n"
            )
            .attachFiles([attachment])
            .setImage("attachment://welcome.png");

        embed.addField("\u200b", "\u200b");
        for (const { emoji, title, text } of noteworthyChannels) {
            embed.addField(`${emoji} ${title}`, text);
        }

        // Functions
        const actionRow = new MessageActionRow().addComponents([
            new MessageButton({
                style: "PRIMARY",
                label: "Sign up for #announcements",
                customID: ANNOUNCEMENTS_ID,
                ...emoji("📢")
            })
        ]);

        await welcomeChan.send(member.toString(), { embed, components: [actionRow] });
    }

    async giveAnnouncementsRole(interaction: MessageComponentInteraction): Promise<void> {
        const member = interaction.member as GuildMember;
        if (!member) return;

        member.roles.add(roles.announcements);

        await interaction.reply({
            embeds: [new MessageEmbed({ description: "You now have the announcements role!" })],
            allowedMentions: { repliedUser: false },
            ephemeral: true
        });
    }
}
