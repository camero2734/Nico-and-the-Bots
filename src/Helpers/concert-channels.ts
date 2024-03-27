import { addDays, format, isPast } from "date-fns";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ForumChannel,
    Guild,
    Role,
    ThreadChannel
} from "discord.js";
import { channelIDs, roles } from "../Configuration/config";
import { prisma } from "./prisma-init";
import F from "./funcs";

const CONCERT_URL = "https://rest.bandsintown.com/V3.1/artists/twenty%20one%20pilots/events/?app_id=js_127.0.0.1";
const ROLE_HEX = "#ffc6d5";

export interface Offer {
    type: string;
    url: string;
    status: string;
}

export interface Venue {
    country: string;
    city: string;
    latitude: string;
    name: string;
    location: string;
    region: string;
    longitude: string;
}

export interface ConcertEntry {
    offers: Offer[];
    venue: Venue;
    datetime: Date;
    artist: Record<string, unknown>;
    on_sale_datetime: string;
    description: string;
    lineup: string[];
    bandsintown_plus: boolean;
    id: string;
    title: string;
    artist_id: string;
    url: string;
}

class ConcertChannel {
    public concerts: ConcertEntry[] = [];
    constructor(public concert: ConcertEntry) {
        this.concerts.push(concert);
    }

    addConcertsFrom(concert: ConcertChannel): boolean {
        if (this.venueId !== concert.venueId) return false;
        this.concerts.push(...concert.concerts);
        return true;
    }

    get name() {
        return this.concert.title || this.concert.venue.name;
    }

    get id() {
        return this.concert.id;
    }

    get venueId() {
        const { venue } = this.concert;
        const s = (str: string) => str.toLowerCase().normalize("NFKC").replace(/\p{Diacritic}/gu, "").replace(/[^A-z0-9]/g, " ").split(/ +/);
        return [s(this.name), s(venue.city)].flat().filter(a => a).join("-");
    }

    get country() {
        return this.concert?.venue?.country;
    }

    get datesFormatted() {
        return this.concerts.map((c) => format(new Date(c.datetime), "d MMMM yyyy")).join(", ");
    }

    get location() {
        return this.concert.venue.location;
    }

    get threadName() {
        return `${this.concert.venue.name} - ${this.flagEmoji} ${this.location}, ${this.country} - ${this.datesFormatted}`
    }

    get roleName() {
        return this.venueId;
    }

    get presaleUrl() {
        return this.concert.offers.find((o) => o.type === "Presale")?.url;
    }

    get flagEmoji() {
        const code = F.countryNameToCode(this.country);
        if (!code) return;

        return F.isoCountryToEmoji(code);
    }

    get continent() {
        const code = F.countryNameToCode(this.country);
        if (!code) return;

        return F.isoCountryToContinent(this.country);
    }

    async threadTags(forumChannel: ForumChannel) {
        const tags = [];
        const hasMultipleDates = this.concerts.length > 1;
        if (hasMultipleDates) {
            const tag = forumChannel.availableTags.find((t) => t.name.toLowerCase().includes("multiple shows"));
            if (tag) tags.push(tag);
        }

        const continent = this.continent?.toLowerCase();
        if (continent) {
            const tag = forumChannel.availableTags.find((t) => t.name.toLowerCase().includes(continent));
            if (tag) tags.push(tag);
        }

        return tags;
    }
}

class ConcertChannelManager {
    public concertChannels: ConcertChannel[] = [];
    constructor(private guild: Guild) { }

    #forumChannel: ForumChannel | undefined;

    async initialize(numToFetch: number): Promise<boolean> {
        const channel = await this.guild.channels.fetch(channelIDs.concertsForum);
        if (channel?.type === ChannelType.GuildForum) this.#forumChannel = channel;

        try {
            const res = await fetch(CONCERT_URL);

            const json = (await res.json()) as ConcertEntry[];
            if (!json || !Array.isArray(json)) throw new Error("Not a valid array");

            const chans = json.slice(0, numToFetch).map((c) => new ConcertChannel(c));
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

            console.log(this.concertChannels.map(x => x.concert), /CHANS/);

            return true;
        } catch (e) {
            console.warn(`Failed to fetch concerts`, e);
            return false;
        }
    }

    async checkChannels(): Promise<boolean> {
        try {
            // Channels in JSON list that don't have a channel
            const existingChannelIds = await prisma.concert.findMany({ select: { id: true, channelId: true, roleId: true, warnedForDeletion: true } });

            const toAdd = this.concertChannels.filter((c) => !existingChannelIds.some((c2) => c2.id === c.id));

            console.log(`[Concert Channels] Adding ${toAdd.length} channels`);

            for (const t of toAdd) {
                await this.#registerConcert(t);
            }

            // Channels that exist, but are no longer in the JSON list
            const toRemove = existingChannelIds.filter((c) => !this.concertChannels.some((c2) => c2.id === c.id));

            console.log(`[Concert Channels] Removing ${toAdd.length} channels`);

            for (const c of toRemove) {
                const channel = await this.guild.channels.fetch(c.channelId);
                const role = await this.guild.roles.fetch(c.roleId);
                if (!channel || !role || !channel.isThread()) continue;
                await this.#unregisterConcert(channel, role, c.warnedForDeletion);
            }

            console.log(`[Concert Channels] Add ${toAdd.length} channels and removed ${toRemove.length} channels`);

            return true;
        } catch (e) {
            console.warn(`Failed to check channels`, e);
            return false;
        }
    }

    async #registerConcert(toAdd: ConcertChannel): Promise<void> {
        const referenceRole = await this.guild.roles.fetch(roles.topfeed.divider);
        if (!referenceRole) {
            console.log(`[Concert Channels] Reference role not found`);
            return;
        }
        if (!this.#forumChannel) {
            console.log(`[Concert Channels] Forum channel not found`);
            return;
        }

        console.log(`[Concert Channels] Registering ${toAdd.venueId}`);
        const role = await this.guild.roles.create({
            name: toAdd.roleName,
            color: ROLE_HEX,
            position: referenceRole.position + 1
        });

        const initialMessage = `## Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} concert discussion thread!\n### 📍 ${toAdd.location}, ${toAdd.continent}\nFeel free to discuss the concert, tickets, share pictures, etc.\n\n:warning: This channel will be archived 3 days after the concert ends.`

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel("Tickets")
                .setEmoji("🎟️")
                .setStyle(ButtonStyle.Link)
                .setURL(toAdd.concert.url)
        )

        if (toAdd.presaleUrl) {
            actionRow.addComponents(
                new ButtonBuilder()
                    .setLabel("Presale")
                    .setEmoji("⚡")
                    .setStyle(ButtonStyle.Link)
                    .setURL(toAdd.presaleUrl)
            );
        }

        actionRow.addComponents(
            new ButtonBuilder()
                .setLabel("Get Role")
                .setEmoji("🎫")
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`TBABTABTATBABA-${role.id}`)
        )

        const forumPost = await this.#forumChannel.threads.create({
            name: toAdd.threadName,
            message: { content: initialMessage, components: [actionRow] },
            reason: "Concert thread",
        });

        const threadTags = await toAdd.threadTags(this.#forumChannel);
        if (threadTags) await forumPost.setAppliedTags(threadTags.map(t => t.id));

        // await prisma.concert.create({
        //     data: {
        //         id: toAdd.id,
        //         channelId: forumPost.id,
        //         roleId: role.id,
        //         warnedForDeletion: null,
        //         venue: toAdd.concert.venue.name
        //     }
        // });

    }

    async #unregisterConcert(toArchive: ThreadChannel, role: Role, warnedAt: Date | null): Promise<boolean> {
        if (toArchive.parentId !== channelIDs.concertsForum) return false;

        // Send message to channel that it will be deleted in 3 days
        if (!warnedAt) {
            await toArchive.send("# This channel (and the corresponding role) will be archived in 3 days. Please save any important information.");
            await prisma.concert.update({ where: { id: toArchive.id }, data: { warnedForDeletion: new Date() } });
            return false;
        }

        if (isPast(addDays(warnedAt, 3))) {
            await toArchive.setArchived(true, "Concert ended three days ago");
            await role.delete();
            return true;
        }

        return false;
    }
}

let concertChannelManager: ConcertChannelManager;
export const getConcertChannelManager = function (guild: Guild) {
    if (!concertChannelManager) concertChannelManager = new ConcertChannelManager(guild);

    return concertChannelManager;
};
