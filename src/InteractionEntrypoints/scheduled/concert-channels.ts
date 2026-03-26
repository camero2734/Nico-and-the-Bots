import { ActionRowBuilder, LinkButtonBuilder } from "@discordjs/builders";
import { ChannelType, type ForumChannel, type Guild } from "discord.js";
import { channelIDs } from "../../Configuration/config";
import { createBackgroundEvent, emitWideEvent, finalizeWideEvent, type WideEvent } from "../../Helpers/logging/wide-event";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { CONCERT_URL, ConcertChannel, type ConcertEntry } from "./concert-channels.consts";

const entrypoint = new ManualEntrypoint();

class ConcertChannelManager {
  public concertChannels: ConcertChannel[] = [];
  private wideEvent: WideEvent | null = null;
  constructor(private guild: Guild) { }

  #forumChannel: ForumChannel | undefined;

  async initialize(): Promise<boolean> {
    this.wideEvent = createBackgroundEvent("concert_channels_init");
    const channel = await this.guild.channels.fetch(channelIDs.concertsForum);
    if (channel?.type === ChannelType.GuildForum) this.#forumChannel = channel;

    try {
      const res = await fetch(CONCERT_URL);

      const json = (await res.json()) as ConcertEntry[];
      if (!json || !Array.isArray(json)) throw new Error("Not a valid array");

      const chans = json.toReversed().map((c) => new ConcertChannel(c));
      if (chans.length === 0) {
        finalizeWideEvent(this.wideEvent, "success");
        emitWideEvent(this.wideEvent);
        return false;
      }

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
      this.wideEvent.extended.channels_fetched = noDupes.length;

      finalizeWideEvent(this.wideEvent, "success");
      emitWideEvent(this.wideEvent);
      return true;
    } catch (e) {
      finalizeWideEvent(this.wideEvent, "error", e);
      emitWideEvent(this.wideEvent);
      return false;
    }
  }

  async checkChannels() {
    this.wideEvent = createBackgroundEvent("concert_channels_check");
    try {
      // Channels in JSON list that don't have a channel
      const existingChannelIds = await prisma.concert.findMany({
        select: { id: true, channelId: true, roleId: true },
      });

      const toAdd = this.concertChannels.filter((c) => !existingChannelIds.some((c2) => c2.id === c.id));

      this.wideEvent.extended.channels_to_add = toAdd.length;

      const added: string[] = [];
      const failed: string[] = [];

      for (const t of toAdd) {
        try {
          await this.#registerConcert(t);
          added.push(t.venueId);
        } catch (e) {
          failed.push(t.venueId);
        }
      }

      this.wideEvent.extended.channels_added = added;
      this.wideEvent.extended.channels_failed = failed.length > 0 ? failed : undefined;

      finalizeWideEvent(this.wideEvent, "success");
      emitWideEvent(this.wideEvent);
      return toAdd;
    } catch (e) {
      finalizeWideEvent(this.wideEvent, "error", e);
      emitWideEvent(this.wideEvent);
      return [];
    }
  }

  get forumChannel() {
    if (!this.#forumChannel) throw new Error("Forum channel not initialized");
    return this.#forumChannel;
  }

  async #registerConcert(toAdd: ConcertChannel): Promise<void> {
    if (!this.#forumChannel) {
      return;
    }

    const initialMessage = `## Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} festival discussion thread!\n### 📍 ${toAdd.location}, ${toAdd.continent}\nFeel free to discuss the festival, tickets, share pictures, etc.`;

    const actionRow = new ActionRowBuilder().addComponents(
      new LinkButtonBuilder().setLabel("Tickets").setEmoji({ name: "🎟️" }).setURL(toAdd.concert.url),
    );

    if (toAdd.presaleUrl) {
      actionRow.addComponents(
        new LinkButtonBuilder().setLabel("Presale").setEmoji({ name: "⚡" }).setURL(toAdd.presaleUrl),
      );
    }

    const forumPost = await this.#forumChannel.threads.create({
      name: toAdd.threadName,
      message: { content: initialMessage, components: [actionRow] },
      reason: "Concert thread",
    });

    const threadTags = await toAdd.threadTags(this.#forumChannel);
    if (threadTags) await forumPost.setAppliedTags(threadTags.map((t) => t.id));

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
