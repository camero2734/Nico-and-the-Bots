import { Entity, Column, ObjectIdColumn } from "typeorm";
import { DailyBox } from "./DailyBox";

@Entity()
export class Economy {
    @ObjectIdColumn()
    id: string;

    @Column()
    dailyBox: DailyBox;

    @Column()
    credits: number;

    @Column()
    monthlyScore: number;

    @Column()
    alltimeScore: number;

    @Column()
    level: number;

    constructor(params: {
        id: string;
        credits?: number;
        monthlyScore?: number;
        alltimeScore?: number;
        level?: number;
    }) {
        if (params) {
            this.id = params.id;
            this.monthlyScore = params.monthlyScore || 0;
            this.alltimeScore = params.alltimeScore || 0;
            this.credits = params.credits || 0;
            this.level = params.level || 0;
            this.dailyBox = new DailyBox({});
        }
    }
}
