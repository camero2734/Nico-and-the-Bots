import { ButtonStyle, ChannelType, type ForumChannel, type Guild } from "discord.js";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { channelIDs } from "../../Configuration/config";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { CONCERT_URL, ConcertChannel, type ConcertEntry } from "./concert-channels.consts";

const entrypoint = new ManualEntrypoint();

class ConcertChannelManager {
  public concertChannels: ConcertChannel[] = [];
  constructor(private guild: Guild) { }

  #forumChannel: ForumChannel | undefined;

  async initialize(): Promise<boolean> {
    const channel = await this.guild.channels.fetch(channelIDs.concertsForum);
    if (channel?.type === ChannelType.GuildForum) this.#forumChannel = channel;

    try {
      const res = await fetch(CONCERT_URL);

      const json = (await res.json()) as ConcertEntry[];
      if (!json || !Array.isArray(json)) throw new Error("Not a valid array");

      const chans = json.toReversed().map((c) => new ConcertChannel(c));
      if (chans.length === 0) return false;

      // Some concerts are multiple days, compress them into one channel to avoid confusion
      const noDupes = [];
      let lastChannel: ConcertChannel = chans[0];

      for (const chan of chans.slice(1)) {
        if (lastChannel.venueId === chan.venueId) {
          lastChannel.addConcertsFrom(chan);
        } else {
          noDupes.push(lastChannel);
          lastChannel = chan;
        }
      }

      noDupes.push(lastChannel);

      this.concertChannels = noDupes;

      console.log(
        this.concertChannels.map((x) => x.concert),
        /CHANS/,
      );

      return true;
    } catch (e) {
      console.warn("Failed to fetch concerts", e);
      return false;
    }
  }

  async checkChannels() {
    try {
      // Channels in JSON list that don't have a channel
      const existingChannelIds = await prisma.concert.findMany({
        select: { id: true, channelId: true, roleId: true },
      });

      const toAdd = this.concertChannels.filter((c) => !existingChannelIds.some((c2) => c2.id === c.id));

      console.log(`[Concert Channels] Adding ${toAdd.length} channels`);

      for (const t of toAdd) {
        try {
          await this.#registerConcert(t);
        } catch (e) {
          console.warn(`[Concert Channels] Failed to register concert ${t.id}`, e);
          throw e;
        }
      }

      console.log(`[Concert Channels] Add ${toAdd.length} channels`);

      return toAdd;
    } catch (e) {
      console.warn("Failed to check channels", e);
      return [];
    }
  }

  get forumChannel() {
    if (!this.#forumChannel) throw new Error("Forum channel not initialized");
    return this.#forumChannel;
  }

  async #registerConcert(toAdd: ConcertChannel): Promise<void> {
    if (!this.#forumChannel) {
      console.log("[Concert Channels] Forum channel not found");
      return;
    }

    console.log(
      `[Concert Channels] Registering ${toAdd.venueId} with role ${toAdd.roleName} and thread ${toAdd.threadName}`,
    );

    const initialMessage = `## Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} festival discussion thread!\n### 📍 ${toAdd.location}, ${toAdd.continent}\nFeel free to discuss the festival, tickets, share pictures, etc.`;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Tickets").setEmoji({ name: "🎟️" }).setStyle(ButtonStyle.Link).setURL(toAdd.concert.url),
    );

    if (toAdd.presaleUrl) {
      actionRow.addComponents(
        new ButtonBuilder().setLabel("Presale").setEmoji({ name: "⚡" }).setStyle(ButtonStyle.Link).setURL(toAdd.presaleUrl),
      );
    }

    console.log(`[Concert Channels] Creating thread for ${toAdd.threadName}`);
    const forumPost = await this.#forumChannel.threads.create({
      name: toAdd.threadName,
      message: { content: initialMessage, components: [actionRow] },
      reason: "Concert thread",
    });

    console.log(`[Concert Channels] Created thread for ${toAdd.threadName} with ID ${forumPost.id}`);
    const threadTags = await toAdd.threadTags(this.#forumChannel);

    console.log(`[Concert Channels] Setting tags for ${toAdd.threadName}`, threadTags);
    if (threadTags) await forumPost.setAppliedTags(threadTags.map((t) => t.id));

    console.log(`[Concert Channels] Saving concert info to database for ${toAdd.venueId}`);
    await prisma.concert.create({
      data: {
        id: toAdd.id,
        channelId: forumPost.id,
        roleId: Bun.randomUUIDv7(),
        venue: toAdd.concert.venue.name,
      },
    });
  }
}

let concertChannelManager: ConcertChannelManager;
export const getConcertChannelManager = (guild: Guild) => {
  if (!concertChannelManager) concertChannelManager = new ConcertChannelManager(guild);

  return concertChannelManager;
};

export default entrypoint;
