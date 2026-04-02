import { ActionRowBuilder, EmbedBuilder, PrimaryButtonBuilder } from "@discordjs/builders";
import { Client, Events, type TextChannel } from "discord.js";
import { channelIDs, guildID } from "../Configuration/config";
import secrets from "../Configuration/secrets";
import { GenColorBtnId } from "../InteractionEntrypoints/messageinteractions/shopColors";
import { GenSongBtnId } from "../InteractionEntrypoints/messageinteractions/shopSongs";
import { client as NicoClient } from "./nico";
export class KeonsBot {
  client: Client;

  static async create(): Promise<KeonsBot> {
    const bot = new KeonsBot();
    bot.client = new Client({
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
        "GuildWebhooks",
      ],
    });

    // Temporary fix for fetchShardCount being called in discord.js
    if (!(bot.client.ws as any).fetchShardCount && typeof bot.client.ws.getShardCount === "function") {
      (bot.client.ws as any).fetchShardCount = bot.client.ws.getShardCount.bind(bot.client.ws);
    }

    bot.client.on(Events.InteractionCreate, (interaction) => {
      console.log("Interaction created:", interaction.type);
      NicoClient.emit(Events.InteractionCreate, interaction);
    });

    console.log("[shop] logging in");
    await bot.client.login(secrets.bots.keons);
    console.log("[shop] login attempted");
    await new Promise((resolve) => bot.client.once(Events.ClientReady, resolve));
    console.log("[shop] client ready");
    return bot;
  }

  async setupShop(): Promise<void> {
    const guild = await this.client.guilds.fetch(guildID);
    const chan = (await guild.channels.fetch(channelIDs.shop)) as TextChannel;

    await chan.bulkDelete(100); // Delete all messages

    console.log("[shop] setting up welcome message");

    const welcomeEmbed = new EmbedBuilder()
      .setAuthor({
        name: "Good Day Dema® Discord Shop",
        icon_url: "https://i.redd.it/wd53naq96lr61.png",
      })
      .setTitle("Welcome!")
      .setColor(0xd07a21)
      .setDescription(
        "Welcome to the ever-expanding Good Day Dema® Discord Shop! We are currently offering **five fantastic color role collections!**",
      )
      .addFields([
        {
          name: "Quick Start",
          value:
            "To access the color role shop, press the `Color Roles` button below. This will open up a shop menu that only you can see!",
        },
        {
          name: "What are credits?",
          value:
            "Credits are earned in two main ways:\n\n`1.` By using the `/daily` command every single day. This gives you a free drop of credits that you can use every 24 hours.\n\n`2.` By being active in the server! Every message you send has a small chance of earning credits. Additionally, when you level up, you will receive additional credits.\n\nThese credits can be used to purchase things from this shop!",
        },
        {
          name: "How do I level up?",
          value:
            "Levels are determined by the number of **points** you have. To check the number of points you have, your level, and how far away you are from the next level, use the `/score` command.",
        },
        {
          name: "What is the Torchbearers role?",
          value:
            "The Torchbearers role is awarded to users who have contributed to our community, usually by being active. You may apply at any time by using the `/apply torchbearers` command, but we generally recommend to wait until you've been here for at least a few months.",
        },
        {
          name: "I have a suggestion for a new shop item",
          value:
            "We at Good Day Dema® Discord Shop love to hear customer feedback! Simply use the `/suggest` command to suggest a new shop item, and make sure to tell us why you think it would be cool.",
        },
      ])
      .setFooter({
        text: "Notice: This shop and all related media is run solely by the Discord Clique and has no affiliation with or sponsorship from the band. Good Day Dema® and DMA ORG® are registered trademarks of The Sacred Municipality of Dema. Restrictions may apply. Void where prohibited.",
      });

    const colorRolesBtn = new PrimaryButtonBuilder().setLabel("Color Roles").setCustomId(GenColorBtnId({}));

    const songRolesBtn = new PrimaryButtonBuilder().setLabel("Song Roles").setCustomId(GenSongBtnId({}));

    const actionRow = new ActionRowBuilder().addComponents(colorRolesBtn, songRolesBtn);

    console.log("[shop] sending welcome message");
    await chan.send({ embeds: [welcomeEmbed], components: [actionRow] });
    console.log("[shop] welcome message sent");
  }
}
