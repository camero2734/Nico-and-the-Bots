import { Entity, Column, ObjectIdColumn, ObjectID } from "typeorm";

@Entity()
export class DailyBox {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    tokens: number;

    @Column()
    steals: number;

    @Column()
    blocks: number;

    @Column()
    ingots: number;

    @Column()
    trophies: number;

    @Column()
    lastDaily: number;

    @Column()
    dailyCount: number;

    constructor(params: {
        tokens?: number;
        steals?: number;
        blocks?: number;
        ingots?: number;
        trophies?: number;
        lastDaily?: number;
        dailyCount?: number;
    }) {
        if (params) {
            this.tokens = params.tokens || 0;
            this.steals = params.steals || 0;
            this.blocks = params.blocks || 0;
            this.ingots = params.ingots || 0;
            this.trophies = params.trophies || 0;
            this.lastDaily = params.lastDaily || 0;
            this.dailyCount = params.dailyCount || 0;
        }
    }
}
