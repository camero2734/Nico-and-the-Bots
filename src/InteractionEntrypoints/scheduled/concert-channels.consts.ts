import { format } from "date-fns";
import {
    ForumChannel
} from "discord.js";
import F from "../../Helpers/funcs";

export const CONCERT_URL = "https://rest.bandsintown.com/V3.1/artists/twenty%20one%20pilots/events/?app_id=js_127.0.0.1";
export const ROLE_HEX = "#ffc6d5";

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

export class ConcertChannel {
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
        return `🎟️ ${this.concert.venue.name} - ${this.location}`;
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

        return F.isoCountryToContinent(code);
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
