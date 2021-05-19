import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class Counter {
    @ObjectIdColumn()
    c: ObjectID;

    @Column()
    id: string;

    @Column()
    title: string;

    @Column()
    count: number;

    @Column()
    lastUpdated: number;

    constructor(params: { id: string; title: string; count?: number; lastUpdated?: number }) {
        if (params) {
            this.id = params.id;
            this.title = params.title;
            this.count = params.count || 0;
            this.lastUpdated = params.lastUpdated || Date.now();
        }
    }
}
