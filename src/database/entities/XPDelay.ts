import { Entity, Column, ObjectIdColumn } from "typeorm";

@Entity()
export class XPDelay {
    @ObjectIdColumn()
    id: string;

    @Column()
    messageCount: number;

    @Column()
    nextTime: number;

    constructor(params: { id: string; messageCount: number; nextTime: number }) {
        if (params) {
            this.id = params.id;
            this.messageCount = params.messageCount || 0;
            this.nextTime = params.nextTime || Date.now();
        }
    }
}
