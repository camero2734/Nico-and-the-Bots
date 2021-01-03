import { Entity, Column, PrimaryColumn, BaseEntity } from "typeorm";

@Entity()
export class FM extends BaseEntity {
    @Column("text")
    id: string;

    @PrimaryColumn("text")
    message_id: string;

    @Column("text")
    track: string;

    @Column("text")
    album: string;

    @Column("text")
    artist: string;

    @Column("int")
    stars: number;

    @Column("int")
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
        super();
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
