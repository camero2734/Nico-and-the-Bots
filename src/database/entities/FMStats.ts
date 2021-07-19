import { Snowflake } from "discord.js";
import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class FMStats {
    @ObjectIdColumn()
    _id: ObjectID;

    @Column()
    type: "TRACK" | "ALBUM" | "ARTIST";

    @Column()
    identifier: string;

    @Column()
    userid: Snowflake;

    @Column()
    playCount: number;

    constructor(params: { fmuser: string; artist: string; playcount?: number }) {
        if (params) {
            //
        }
    }
}
