import {
    Client,
    Intents,
    MessageEmbed,
    TextChannel,
    GuildMember,
    MessageAttachment,
    MessageActionRow,
    MessageButton,
    Snowflake,
    MessageComponentInteraction
} from "discord.js";
import * as secrets from "configuration/secrets.json";
import { channelIDs, guildID, roles, userIDs } from "configuration/config";
import { createCanvas } from "canvas";
import { Mutex } from "async-mutex";
import { Connection, ReturningStatementNotSupportedError } from "typeorm";
import { Counter } from "database/entities/Counter";
import { MessageTools } from "helpers";
import { ComponentButton, PartialEmoji } from "slash-create";

const ANNOUNCEMENTS_ID = "?announcements";

const chanToURL = (id: string) => `https://discord.com/channels/${guildID}/${id}/`;
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

        const canvas = createCanvas(500, 500);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FCE300";
        ctx.fillRect(0, 0, 500, 500);
        const attachment = new MessageAttachment(canvas.toBuffer(), "welcome.png");

        const embed = new MessageEmbed()
            .setTitle("Welcome to the twenty one pilots Discord server!")
            .setAuthor(member.displayName, member.user.displayAvatarURL())
            .setDescription(
                "Curious to explore the server? Click one of the options below to be redirected to a channel.\n\nWe make announcements any time something happens with the band or the server - stay up to date by clicking the button `Sign up for #announcements` button below"
            )
            .attachFiles([attachment])
            .setImage("attachment://welcome.png");

        // Functions
        const actionRow1 = new MessageActionRow().addComponents([
            new MessageButton({
                style: "PRIMARY",
                label: "Sign up for #announcements",
                customID: ANNOUNCEMENTS_ID,
                ...emoji("📢")
            })
        ]);

        // Links
        const actionRow2 = new MessageActionRow().addComponents([
            new MessageButton({
                style: "LINK",
                label: "Check out #hometown",
                url: chanToURL(channelIDs.hometown),
                ...emoji("🏠")
            }),
            new MessageButton({
                style: "LINK",
                label: "Use bots in #commands",
                url: chanToURL(channelIDs.commands),
                ...emoji("🤖")
            }),
            new MessageButton({
                style: "LINK",
                label: "Discuss theories in #theories",
                url: chanToURL(channelIDs.leakstheories),
                ...emoji("THEORY", "404458118299254785")
            }),
            new MessageButton({
                style: "LINK",
                label: "Check out our community's #creations",
                url: chanToURL(channelIDs.creations),
                ...emoji("🧑‍🎨")
            }),
            new MessageButton({
                style: "LINK",
                label: "Stay up to date with the band's posts",
                url: chanToURL(channelIDs.band),
                ...emoji("🥁")
            })
        ]);

        await welcomeChan.send(member.toString(), { embed, components: [actionRow1, actionRow2] });
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
