import {
    Client,
    ActionRowComponent,
    ButtonComponent,
    Embed,
    TextChannel,
    ActionRow,
    ButtonStyle
} from "discord.js/packages/discord.js";
import secrets from "../Configuration/secrets";
import { channelIDs, guildID } from "../Configuration/config";
import { GenBtnId } from "../InteractionEntrypoints/messageinteractions/shopColors";
import { NicoClient } from "../../app";

export class KeonsBot {
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
        this.client.login(secrets.bots.keons);

        this.ready = new Promise((resolve) => {
            this.client.on("ready", () => resolve());
        });

        this.client.on("interactionCreate", (int) => NicoClient.listeners("interactionCreate")[0](int));
    }

    async setupShop(): Promise<void> {
        await this.ready; // Ensure the bot is ready before trying to set up the shop

        const guild = await this.client.guilds.fetch(guildID);
        const chan = guild.channels.cache.get(channelIDs.shop) as TextChannel;

        await chan.bulkDelete(100); // Delete all messages

        const welcomeEmbed = new Embed()
            .setAuthor({ name: "Good Day Dema® Discord Shop", iconURL: "https://i.redd.it/wd53naq96lr61.png" })
            .setTitle("Welcome!")
            .setColor(0xd07a21)
            .setDescription(
                "Welcome to the ever-expanding Good Day Dema® Discord Shop! We are currently offering **five fantastic color role collections!**"
            )
            .addField({
                name: "Quick Start",
                value: "To access the color role shop, use the **slash command** `/shop colors` in this channel. This will open up a shop menu that only you can see!"
            })
            .addField({
                name: "What are credits?",
                value: "Credits are earned in two main ways:\n\n`1.` By using the `/daily` command every single day. This gives you a free drop of credits that you can use every 24 hours.\n\n`2.` By being active in the server! Every message you send has a small chance of earning credits. Additionally, when you level up, you will receive additional credits.\n\nThese credits can be used to purchase things from this shop!"
            })
            .addField({
                name: "How do I level up?",
                value: "Levels are determined by the number of **points** you have. To check the number of points you have, your level, and how far away you are from the next level, use the `/score` command."
            })
            .addField({
                name: "What is the Firebreathers role?",
                value: "The Firebreathers role is awarded to users who have contributed to our community, usually by being active. You may apply at any time by using the `/roles firebreathers` command, but we generally recommend to wait until you've been here for at least a few months."
            })
            .addField({
                name: "I have a suggestion for a new shop item",
                value: "We at Good Day Dema® Discord Shop love to hear customer feedback! Simply use the `/suggest` command to suggest a new shop item, and make sure to tell us why you think it would be cool."
            })
            .setFooter({
                text: "Notice: This shop and all related media is run solely by the Discord Clique and has no affiliation with or sponsorship from the band. Good Day Dema® and DMA ORG® are registered trademarks of The Sacred Municipality of Dema. Restrictions may apply. Void where prohibited."
            });

        const actionRow = new ActionRow().setComponents([
            new ButtonComponent() //
                .setStyle(ButtonStyle.Primary)
                .setLabel("Color Roles")
                .setCustomId(GenBtnId({}))
        ]);

        await chan.send({ embeds: [welcomeEmbed], components: [actionRow] });
    }
}
