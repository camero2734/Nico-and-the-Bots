import { Entity, Column, ObjectIdColumn, ObjectID } from "typeorm";

@Entity()
export class XPDelay {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    userid: string;

    @Column()
    messageCount: number;

    @Column()
    nextTime: number;

    constructor(params: { userid: string; messageCount: number; nextTime: number }) {
        if (params) {
            this.userid = params.userid;
            this.messageCount = params.messageCount || 0;
            this.nextTime = params.nextTime || Date.now();
        }
    }
}
