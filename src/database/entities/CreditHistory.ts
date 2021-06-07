type UserCreditHistory = { [key: string]: number };

import { Snowflake } from "discord.js";
import { Column, Entity, ObjectID, ObjectIdColumn } from "typeorm";
import { startOfDay } from "date-fns";

@Entity()
export class CreditHistory {
    @ObjectIdColumn()
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
