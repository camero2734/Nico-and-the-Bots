import { Snowflake } from "discord.js";
import { BaseEntity, Column, Entity, getMongoManager, ObjectID, ObjectIdColumn } from "typeorm";
import { DailyBox } from "./DailyBox";

@Entity()
export class Economy {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    userid: Snowflake;

    @Column()
    dailyBox: DailyBox;

    @Column()
    credits: number;

    @Column()
    score: number;

    @Column()
    level: number;

    @Column()
    joinedAt: Date;

    constructor(params: {
        userid: Snowflake;
        credits?: number;
        score?: number;
        level?: number;
        joinedAt?: Date | null;
    }) {
        if (params) {
            this.userid = params.userid;
            this.score = params.score || 0;
            this.credits = params.credits || 0;
            this.level = params.level || 0;
            this.dailyBox = new DailyBox({});
            this.joinedAt = params.joinedAt || new Date();
        }
    }

    async getJoinedNum(): Promise<number> {
        const manager = getMongoManager();
        const memberNum = await manager.getMongoRepository(Economy).count({ joinedAt: { $lt: this.joinedAt } });
        return memberNum;
    }

    async getPlaceNum(): Promise<number> {
        const manager = getMongoManager();
        const place = await manager.getMongoRepository(Economy).count({ score: { $gt: this.score } });
        return place + 1;
    }
}
