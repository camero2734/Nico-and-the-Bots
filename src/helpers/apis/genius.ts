import fetch from "node-fetch";
import secrets from "../../configuration/secrets";

type GeniusQueryHit = {
    highlights: unknown[];
    index: "song";
    type: "song";
    result: {
        annotation_count: number;
        api_path: `/songs/${bigint}`;
        full_title: string;
        header_image_thumbnail_url: string;
        header_image_url: string;
        id: number;
        lyrics_owner_id: number;
        lyrics_state: "complete";
        path: string;
        pyongs_count: unknown;
        song_art_image_thumbnail_url: string;
        song_art_image_url: string;
        stats: unknown;
        title: string;
        title_with_featured: string;
        url: string;
        song_art_primary_color: `#${string}`;
        song_art_secondary_color: `#${string}`;
        song_art_text_color: `#${string}`;
        primary_artist: unknown;
    };
};

type GeniusQueryResponse = {
    hits: GeniusQueryHit[];
};

type GeniusResult<T> = {
    meta: { status: number };
    response?: T;
};

class Genius {
    constructor(private access_token: string) {}

    async getSong(query: string): Promise<GeniusQueryHit | null> {
        const res = await fetch(`https://api.genius.com/search?q=${query}`, {
            headers: {
                Authorization: `Bearer ${this.access_token}`
            }
        });
        const json = (await res.json()) as GeniusResult<GeniusQueryResponse>;
        if (json.meta.status !== 200 || !json.response) return null;
        else return json.response.hits[0];
    }
}

export const GeniusClient = new Genius(secrets.apis.genius.access_token);
