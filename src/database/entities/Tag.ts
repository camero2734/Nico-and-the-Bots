import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class Tag {
    @ObjectIdColumn()
    _id: ObjectID;

    @Column()
    identifier: string;

    @Column()
    text: string;

    @Column()
    createdAt: Date;

    @Column()
    userid: string;

    @Column()
    uses: number;

    constructor(params: { text: string; userid: string; identifier: string }) {
        if (params) {
            this.text = params.text;
            this.identifier = params.identifier;
            this.userid = params.userid;
            this.createdAt = new Date();
            this.uses = 0;
        }
    }
}
