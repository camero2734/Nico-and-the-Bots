import {Entity, Column, PrimaryColumn, BaseEntity} from "typeorm";

@Entity()
export class Recap extends BaseEntity {
    @PrimaryColumn("int")
    time: number;

    @Column("text")
    channel: string;

    @Column("int")
    day: number;

    @Column("text")
    id: string;

    constructor(params: { time: number, channel: string, day: number, id: string }) {
        super();
        if (params) {
            this.time = params.time || Date.now();
            this.channel = params.channel;
            this.day = params.day;
            this.id = params.id;
        }
    }
}
