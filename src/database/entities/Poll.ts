import { VoiceStateManager } from "discord.js";
import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

interface Vote {
    index: number;
    userid: string;
}

@Entity()
export class Poll {
    @ObjectIdColumn()
    identifier: string;

    @Column()
    userid: string;

    @Column()
    votes: Vote[];

    constructor(params: { identifier: string; userid: string; votes?: Vote[] }) {
        if (params) {
            this.identifier = params.identifier;
            this.userid = params.userid;
            this.votes = params.votes || [];
        }
    }
}
