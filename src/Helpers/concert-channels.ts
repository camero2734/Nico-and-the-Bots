import { format } from "date-fns";
import {
    ChannelType,
    Guild,
    TextChannel,
    ThreadChannel,
    userMention
} from "discord.js";
import { channelIDs, roles, userIDs } from "../Configuration/config";

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
    // something-arena-chicago
    public channelName: string;
    public concerts: ConcertEntry[] = [];
    constructor(public concert: ConcertEntry, private guild: Guild) {
        const { venue } = concert;
        const s = (str: string) => str.toLowerCase().normalize("NFKC").replace(/\p{Diacritic}/gu, "").replace(/[^A-z0-9]/g, " ").split(/ +/);
        this.channelName = [s(this.name), s(venue.city)].flat().filter(a => a).join("-");
        this.concerts.push(concert);
    }

    addConcertsFrom(concert: ConcertChannel): boolean {
        if (this.channelName !== concert.channelName) return false;
        this.concerts.push(...concert.concerts);
        return true;
    }

    get name() {
        return this.concert.title || this.concert.venue.name;
    }

    get country() {
        return (
            this.concert?.venue?.country
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/[^\w-]/g, "")
                .substring(0, 32) || "other"
        );
    }

    get channel() {
        return this.guild.channels.cache.find((c) => c.name === this.channelName) as TextChannel | undefined;
    }

    async getAssociatedRole() {
        const roles = await this.guild.roles.fetch();
        const role = roles.find((r) => r.name === this.channel?.name);
        return role;
    }
}

class ConcertChannelManager {
    public concertChannels: ConcertChannel[] = [];
    constructor(private guild: Guild) { }

    #forumChannel: TextChannel | undefined;

    async initialize(numToFetch: number): Promise<boolean> {
        this.#forumChannel = await this.guild.channels.fetch(channelIDs.concertsForum) as TextChannel;

        try {
            const res = await fetch(CONCERT_URL);

            const json = (await res.json()) as ConcertEntry[];
            if (!json || !Array.isArray(json)) throw new Error("Not a valid array");

            const chans = json.slice(0, numToFetch).map((c) => new ConcertChannel(c, this.guild));
            if (chans.length === 0) return false;

            // Some concerts are multiple days, compress them into one channel to avoid confusion
            const noDupes = [];
            let lastChannel: ConcertChannel = chans[0];
            for (let i = 1; i < chans.length - 1; i++) {
                if (chans[i].channelName === lastChannel.channelName) {
                    lastChannel.addConcertsFrom(chans[i]);
                } else {
                    noDupes.push(lastChannel);
                    lastChannel = chans[i];
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
            // this.concertChannels = [];
            if (!this.#forumChannel) {
                console.log(`[Concert Channels] Forum channel not found`);
                return false;
            }
            const channelsCollection = await this.#forumChannel.threads.fetchActive();
            const threads = [...channelsCollection.threads.values()];

            // Channels in JSON list that don't have a channel
            const toAdd = this.concertChannels.filter((c) => !threads.some((c2) => c.channelName === c2.name));

            console.log(`[Concert Channels] Adding ${toAdd.length} channels`);

            for (const t of toAdd) {
                await this.#registerConcert(t);
            }

            // Channels that exist, but are no longer in the JSON list
            const toRemove = threads.filter((c) => !this.concertChannels.some((c2) => c2.channelName === c.name));

            console.log(`[Concert Channels] Removing ${toAdd.length} channels`);

            for (const c of toRemove) {
                await this.#unregisterConcert(c);
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
        if (!referenceRole) return;

        const forumChannel = await this.guild.channels.fetch(channelIDs.concertsForum);
        if (forumChannel?.type !== ChannelType.GuildText) return;

        await this.guild.roles.create({
            name: toAdd.channelName,
            color: ROLE_HEX,
            position: referenceRole.position + 1
        });

        const dates = toAdd.concerts.map((c) => format(new Date(c.datetime), "d MMMM yyyy")).join(", ");
        const topic = `${dates} | Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} concert channel! Feel free to discuss the concert, tickets, share pictures, etc. This channel will be archived 3 days after the concert ends.`


        await forumChannel.threads.create({
            name: toAdd.channelName,
            autoArchiveDuration: 4320,
            startMessage: topic,
            reason: "Concert thread",
        });
    }

    async #unregisterConcert(toArchive: ThreadChannel): Promise<boolean> {
        const roles = await toArchive.guild.roles.fetch();
        const role = roles.find((r) => r.name === toArchive.name && r.hexColor === ROLE_HEX);

        if (!role) {
            const devChannel = toArchive.guild.channels.cache.get(channelIDs.bottest) as TextChannel;
            await devChannel.send(
                `${userMention(userIDs.me)} Unable to find associated role for ${toArchive} to delete. Not deleting.`
            );
            return false;
        }

        if (toArchive.parentId !== channelIDs.concertsForum) return false;

        await toArchive.setArchived(true, "Concert ended three days ago");
        await role.delete();
        return true;
    }
}

let concertChannelManager: ConcertChannelManager;
export const getConcertChannelManager = function (guild: Guild) {
    if (!concertChannelManager) concertChannelManager = new ConcertChannelManager(guild);

    return concertChannelManager;
};
