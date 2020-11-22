import {Entity, Column, PrimaryColumn, BaseEntity} from "typeorm";

@Entity()
export class WeekRecap extends BaseEntity {
    @PrimaryColumn("text")
    id: string;

    @Column("text")
    days: string;

    @Column("int")
    lastDay: number;

    constructor(params: { id: string, days: string, lastDay: number }) {
        super();
        if (params) {
            this.id = params.id;
            this.days = params.days;
            this.lastDay = params.lastDay || Date.now();
        }
    }
}
