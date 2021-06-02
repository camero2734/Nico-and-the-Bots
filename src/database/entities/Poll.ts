import { VoiceStateManager } from "discord.js";
import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

interface Vote {
    index: number;
    userid: string;
}

@Entity()
export class Poll {
    @ObjectIdColumn()
    id: string;

    @Column()
    userid: string;

    @Column()
    votes: Vote[];

    constructor(params: { id: string; userid: string; votes?: Vote[] }) {
        if (params) {
            this.id = params.id;
            this.userid = params.userid;
            this.votes = params.votes || [];
        }
    }
}
