import { Column, Entity, ObjectIdColumn } from "typeorm";

@Entity()
export class FM {
    @ObjectIdColumn()
    message_id: string;

    @Column()
    id: string;

    @Column()
    track: string;

    @Column()
    album: string;

    @Column()
    artist: string;

    @Column()
    stars: number;

    @Column()
    time: number;

    constructor(params: {
        id: string;
        message_id: string;
        track: string;
        album: string;
        artist: string;
        stars?: number;
        time?: number;
    }) {
        if (params) {
            this.id = params.id;
            this.message_id = params.message_id;
            this.track = params.track;
            this.album = params.album;
            this.artist = params.artist;
            this.stars = params.stars || 0;
            this.time = params.time || Date.now();
        }
    }
}
