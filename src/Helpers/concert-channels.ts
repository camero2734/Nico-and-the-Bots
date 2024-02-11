import { categoryIDs, channelIDs, guildID, roles, userIDs } from "../Configuration/config";
import { format } from "date-fns";
import {
    CategoryChannel,
    ChannelType,
    Client,
    Collection,
    Guild,
    GuildChannel,
    OverwriteData,
    Role,
    TextChannel
} from "discord.js";
import fetch from "node-fetch";

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
        const { venue, title } = concert;
        const s = (str: string) => str.toLowerCase().normalize("NFKC").replace(/\p{Diacritic}/gu, "").replace(/[^A-z0-9]/g, " ").split(/ +/); // prettier-ignore
        this.channelName = [s(title || venue.name), s(venue.city)].flat().filter(a => a).join("-"); // prettier-ignore
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
    private concertCategory: CategoryChannel;
    constructor(private guild: Guild) {
        this.concertCategory = guild.channels.cache.get(categoryIDs.concerts) as CategoryChannel;
    }

    async fetchConcerts(): Promise<boolean> {
        try {
            const res = await fetch(CONCERT_URL);

            const json = (await res.json()) as ConcertEntry[];
            if (!json || !Array.isArray(json)) throw new Error("Not a valid array");

            const chans = json.map((c) => new ConcertChannel(c, this.guild));
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

            return true;
        } catch (e) {
            console.warn(`Failed to fetch concerts`, e);
            return false;
        }
    }

    async checkChannels(): Promise<boolean> {
        try {
            // this.concertChannels = [];
            if (!this.concertCategory) return false;
            const channelsCollection = this.concertCategory.children.cache as Collection<string, GuildChannel>;
            channelsCollection.delete(channelIDs.tourhelp);
            const channels = [...channelsCollection.values()];

            // Channels in JSON list that don't have a channel
            const toAdd = this.concertChannels.filter((c) => !channels.some((c2) => c.channelName === c2.name));

            for (const t of toAdd) {
                await this.#addChannel(t);
            }

            // Channels that exist, but are no longer in the JSON list
            const toRemove = channels.filter((c) => !this.concertChannels.some((c2) => c2.channelName === c.name));

            for (const c of toRemove) {
                await this.#deleteChannel(c);
            }

            console.log(`[Concert Channels] Add ${toAdd.length} channels and removed ${toRemove.length} channels`);

            return true;
        } catch (e) {
            console.warn(`Failed to check channels`, e);
            return false;
        }
    }

    async #addChannel(toAdd: ConcertChannel): Promise<void> {
        const referenceRole = await this.guild.roles.fetch(roles.topfeed.divider);
        if (!referenceRole) return;

        const role = await this.guild.roles.create({
            name: toAdd.channelName,
            color: ROLE_HEX,
            position: referenceRole.position + 1
        });

        const permissionOverwrites: OverwriteData[] = [
            {
                deny: ["ViewChannel"],
                id: guildID
            },
            {
                allow: ["ViewChannel", "SendMessages"],
                id: roles.staff // Staff
            },
            {
                allow: ["ViewChannel"],
                id: role.id // The role that was just created
            },
            {
                allow: ["ViewChannel", "SendMessages", "ManageChannels"],
                id: roles.bots // Bots
            },
            {
                deny: ["SendMessages"],
                id: roles.muted // Muted
            }
        ];

        const dates = toAdd.concerts.map((c) => format(new Date(c.datetime), "d MMMM yyyy")).join(", ");
        // prettier-ignore
        const topic = `${dates} | Welcome to the ${toAdd.concert.title || toAdd.concert.venue.name} concert channel! Feel free to discuss the concert, tickets, share pictures, etc. This channel will be deleted 3 days after the concert ends.`

        const channel = await this.guild.channels.create({
            name: toAdd.channelName,
            permissionOverwrites,
            type: ChannelType.GuildText,
            topic
        });
        await channel.setParent(categoryIDs.concerts, { lockPermissions: false });
    }

    async #deleteChannel(toDelete: GuildChannel): Promise<boolean> {
        const roles = await toDelete.guild.roles.fetch();
        const role = roles.find((r) => r.name === toDelete.name && r.hexColor === ROLE_HEX);

        if (!role) {
            const devChannel = toDelete.guild.channels.cache.get(channelIDs.bottest) as TextChannel;
            await devChannel.send(
                `<@${userIDs.me}> Unable to find associated role for ${toDelete} to delete. Not deleting.`
            );
            return false;
        }

        if (toDelete.parentId !== categoryIDs.concerts) return false;

        await toDelete.delete();
        await role.delete();
        return true;
    }
}

let concertChannelManager: ConcertChannelManager;

export const getConcertChannelManager = function (guild: Guild) {
    if (!concertChannelManager) concertChannelManager = new ConcertChannelManager(guild);

    return concertChannelManager;
};
