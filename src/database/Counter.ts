import {Entity, Column, PrimaryGeneratedColumn, BaseEntity} from "typeorm";

@Entity()
export class Counter extends BaseEntity {
    @PrimaryGeneratedColumn()
    c: number;

    @Column("text")
    id: string;

    @Column("text")
    title: string;

    @Column("int")
    count: number;

    @Column("int")
    lastUpdated: number;

    constructor(params: { id: string, title: string, count: number, lastUpdated: number }) {
        super();
        if (params) {
            this.id = params.id;
            this.title = params.title;
            this.count = params.count || 0;
            this.lastUpdated = params.lastUpdated || Date.now();
        }
    }
}
