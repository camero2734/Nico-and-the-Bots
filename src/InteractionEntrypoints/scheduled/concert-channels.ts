import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ForumChannel,
  type Guild,
  MessageFlags,
} from "discord.js";
import { guild } from "../../../app";
import { channelIDs, roles } from "../../Configuration/config";
import { prisma } from "../../Helpers/prisma-init";
import { ManualEntrypoint } from "../../Structures/EntrypointManual";
import { CONCERT_URL, ConcertChannel, type ConcertEntry, ROLE_HEX } from "./concert-channels.consts";

const entrypoint = new ManualEntrypoint();

class ConcertChannelManager {
  public concertChannels: ConcertChannel[] = [];
  constructor(private guild: Guild) {}

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

  async checkChannels(): Promise<boolean> {
    try {
      // Channels in JSON list that don't have a channel
      const existingChannelIds = await prisma.concert.findMany({
        select: { id: true, channelId: true, roleId: true },
      });

      const toAdd = this.concertChannels.filter((c) => !existingChannelIds.some((c2) => c2.id === c.id));

      console.log(`[Concert Channels] Adding ${toAdd.length} channels`);

      for (const t of toAdd) {
        await this.#registerConcert(t);
      }

      console.log(`[Concert Channels] Add ${toAdd.length} channels`);

      return true;
    } catch (e) {
      console.warn("Failed to check channels", e);
      return false;
    }
  }

  async #registerConcert(toAdd: ConcertChannel): Promise<void> {
    const referenceRole = await this.guild.roles.fetch(roles.topfeed.divider);
    if (!referenceRole) {
      console.log("[Concert Channels] Reference role not found");
      return;
    }
    if (!this.#forumChannel) {
      console.log("[Concert Channels] Forum channel not found");
      return;
    }

    console.log(`[Concert Channels] Registering ${toAdd.venueId}`);
    const role = await this.guild.roles.create({
      name: toAdd.roleName,
      color: ROLE_HEX,
      position: referenceRole.position + 1,
    });

    const initialMessage = `## Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} concert discussion thread!\n### 📍 ${toAdd.location}, ${toAdd.continent}\nFeel free to discuss the concert, tickets, share pictures, etc.`;

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Tickets").setEmoji("🎟️").setStyle(ButtonStyle.Link).setURL(toAdd.concert.url),
    );

    if (toAdd.presaleUrl) {
      actionRow.addComponents(
        new ButtonBuilder().setLabel("Presale").setEmoji("⚡").setStyle(ButtonStyle.Link).setURL(toAdd.presaleUrl),
      );
    }

    actionRow.addComponents(
      new ButtonBuilder()
        .setLabel("Get Role")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(genBtnId({ roleId: role.id })),
    );

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
        roleId: role.id,
        venue: toAdd.concert.venue.name,
      },
    });
  }
}

const genBtnId = entrypoint.addInteractionListener("getConcertRole", ["roleId"], async (ctx, args) => {
  await ctx.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const role = await guild.roles.fetch(args.roleId);
  if (!role) {
    ctx.editReply("Role not found");
    return;
  }

  if (ctx.member.roles.cache.has(role.id)) {
    await ctx.member.roles.remove(role);
    await ctx.editReply("🎫 Concert Role removed!");
  } else {
    await ctx.member.roles.add(role);
    await ctx.editReply("🎫 Concert Role added!");
  }
});

let concertChannelManager: ConcertChannelManager;
export const getConcertChannelManager = (guild: Guild) => {
  if (!concertChannelManager) concertChannelManager = new ConcertChannelManager(guild);

  return concertChannelManager;
};

export default entrypoint;

// new Cron("44 1 * * *", async () => {
//   if (!guild) return;
//   await concertChannelManager.initialize();
//   await concertChannelManager.checkChannels();
// });
