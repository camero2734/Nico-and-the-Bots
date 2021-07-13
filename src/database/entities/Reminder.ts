import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

@Entity()
export class Reminder {
    @ObjectIdColumn()
    _id: ObjectID;

    @Column()
    text: string;

    @Column()
    sendAt: Date;

    @Column()
    createdAt: Date;

    @Column()
    userid: string;

    constructor(params: { text: string; userid: string; sendAt: Date }) {
        if (params) {
            this.text = params.text;
            this.sendAt = params.sendAt;
            this.userid = params.userid;
            this.createdAt = new Date();
        }
    }
}
