import { Entity, Column, ObjectIdColumn, ObjectID } from "typeorm";

@Entity()
export class Topfeed {
    @ObjectIdColumn()
    c: ObjectID;

    @Column()
    type: string;

    @Column()
    link: string;

    @Column()
    date: Date;

    constructor(params: { type: string; link: string; date: Date }) {
        if (params) {
            this.type = params.type;
            this.link = params.link;
            this.date = params.date || new Date();
        }
    }
}
