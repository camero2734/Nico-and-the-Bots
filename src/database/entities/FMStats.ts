import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class FMStats {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    fmuser: string;

    @Column()
    artist: string;

    @Column()
    playcount: number;

    constructor(params: { fmuser: string; artist: string; playcount?: number }) {
        if (params) {
            this.fmuser = params.fmuser;
            this.artist = params.artist;
            this.playcount = params.playcount || 0;
        }
    }
}
