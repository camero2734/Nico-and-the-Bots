import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class Counter {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    identifier: string;

    @Column()
    title: string;

    @Column()
    count: number;

    @Column()
    lastUpdated: number;

    constructor(params: { identifier: string; title: string; count?: number; lastUpdated?: number }) {
        if (params) {
            this.identifier = params.identifier;
            this.title = params.title;
            this.count = params.count || 0;
            this.lastUpdated = params.lastUpdated || Date.now();
        }
    }
}
