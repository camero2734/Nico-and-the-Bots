import {Entity, Column, PrimaryColumn, BaseEntity} from "typeorm";

@Entity()
export class FMStats extends BaseEntity {
    @PrimaryColumn("text")
    fmuser: string;

    @PrimaryColumn("text")
    artist: string;

    @Column("int")
    playcount: number;

    constructor(params: { fmuser: string, artist: string, playcount: number }) {
        super();
        if (params) {
            this.fmuser = params.fmuser;
            this.artist = params.artist;
            this.playcount = params.playcount || 0;
        }
    }
}
