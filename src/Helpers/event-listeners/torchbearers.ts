import { EmbedBuilder } from "@discordjs/builders";
import { type Client, Events } from "discord.js";
import { channelIDs, roles } from "../../Configuration/config";
import { prisma } from "../prisma-init";

export function listenForTorchbearers(client: Client) {
  client.on(Events.GuildMemberUpdate, async (oldMem, newMem) => {
    if (!oldMem || oldMem.partial) {
      console.log("Old member data is missing or partial, skipping torchbearers check.");
      return;
    };

    const hadRole = oldMem.roles.cache.has(roles.deatheaters);
    const hasRole = newMem.roles.cache.has(roles.deatheaters);

    if (hadRole || !hasRole) return;

    const fbAnnouncementChannel = await newMem.guild.channels.fetch(channelIDs.fairlyannouncements);
    if (!fbAnnouncementChannel?.isTextBased()) return;

    const count = await prisma.counter.upsert({
      where: { name: "torchbearers" },
      update: { value: { increment: 1 } },
      create: { name: "torchbearers", value: 1 },
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: newMem.displayName,
        icon_url: newMem.displayAvatarURL(),
      })
      .setDescription(
        `${newMem} has tried to stop the cycle and failed. This has happened ${count.value} times already.`,
      )
      .setFooter({
        text: "MATERIAL SUBJECT TO AUDIT UNDER NOVA BISHOP PROTOCOL",
        icon_url: newMem.client.user?.displayAvatarURL(),
      });

    await fbAnnouncementChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  });
}
