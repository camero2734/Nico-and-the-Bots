import { Entity, Column, ObjectIdColumn, ObjectID } from "typeorm";

@Entity()
export class Topfeed {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    type: string;

    @Column()
    url: string;

    @Column()
    hash: string;

    @Column()
    data?: string | null;

    @Column()
    date: Date;

    constructor(params: { type: string; url: string; date?: Date; hash: string; data?: string }) {
        if (params) {
            this.type = params.type;
            this.url = params.url;
            this.data = params.data || null;
            this.hash = params.hash;
            this.date = params.date || new Date();
        }
    }
}
