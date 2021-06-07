import { Snowflake } from "discord.js";
import { Column, Entity, ObjectIdColumn } from "typeorm";
import { DailyBox } from "./DailyBox";

@Entity()
export class Economy {
    @ObjectIdColumn()
    userid: Snowflake;

    @Column()
    dailyBox: DailyBox;

    @Column()
    credits: number;

    @Column()
    score: number;

    @Column()
    level: number;

    constructor(params: { userid: Snowflake; credits?: number; score?: number; level?: number }) {
        if (params) {
            this.userid = params.userid;
            this.score = params.score || 0;
            this.credits = params.credits || 0;
            this.level = params.level || 0;
            this.dailyBox = new DailyBox({});
        }
    }
}
