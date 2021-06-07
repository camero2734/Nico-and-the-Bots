import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class Item {
    @ObjectIdColumn()
    c: ObjectID;

    @Column()
    identifier: string;

    @Column()
    title: string;

    @Column()
    type: string;

    @Column()
    data?: string;

    @Column()
    time: number;

    constructor(params: { identifier: string; title: string; type: string; data?: string; time?: number }) {
        if (params) {
            this.identifier = params.identifier;
            this.title = params.title;
            this.type = params.type;
            this.data = params.data;
            this.time = params.time || Date.now();
        }
    }
}
