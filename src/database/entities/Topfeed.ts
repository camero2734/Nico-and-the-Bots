import {Entity, Column, PrimaryGeneratedColumn, BaseEntity} from "typeorm";

@Entity()
export class Topfeed extends BaseEntity {
    @PrimaryGeneratedColumn()
    c: number;

    @Column("text")
    type: string;

    @Column("text")
    link: string;

    @Column("int")
    date: number;

    constructor(params: { type: string, link: string, date: number }) {
        super();
        if (params) {
            this.type = params.type;
            this.link = params.link;
            this.date = params.date || Date.now();
        }
    }
}
