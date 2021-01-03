import { Entity, Column, PrimaryColumn, BaseEntity } from "typeorm";

@Entity()
export class XPDelay extends BaseEntity {
    @PrimaryColumn("text")
    id: string;

    @Column("int")
    messageCount: number;

    @Column("int")
    nextTime: number;

    constructor(params: { id: string; messageCount: number; nextTime: number }) {
        super();
        if (params) {
            this.id = params.id;
            this.messageCount = params.messageCount || 0;
            this.nextTime = params.nextTime || Date.now();
        }
    }
}
