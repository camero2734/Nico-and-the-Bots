import { startOfDay } from "date-fns";
import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";

type UserCreditHistory = { [key: string]: number };
@Entity()
export class CreditHistory {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    date: Date;

    @Column()
    entries: UserCreditHistory;

    constructor(params: { date?: Date }) {
        if (params) {
            this.date = params.date || startOfDay(new Date());
            this.entries = {};
        }
    }
}
