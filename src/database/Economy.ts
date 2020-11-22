import {Entity, Column, PrimaryColumn, BaseEntity} from "typeorm";

@Entity()
export class Economy extends BaseEntity {
    @PrimaryColumn("text")
    id: string;

    @Column("int")
    blurrytokens: number;

    @Column("int")
    steals: number;

    @Column("int")
    blocks: number;

    @Column("int")
    ingots: number;

    @Column("int")
    trophies: number;

    @Column("int")
    credits: number;

    @Column("int")
    lastDaily: number;

    @Column("int")
    dailyCount: number;

    @Column("int")
    monthlyScore: number;

    @Column("int")
    alltimeScore: number;

    @Column("int")
    monthlyLevel: number;

    @Column("int")
    alltimeLevel: number;

    constructor(params: { id: string, blurrytokens: number, steals: number, blocks: number, ingots: number, trophies: number, credits: number, lastDaily: number, dailyCount: number, monthlyScore: number, alltimeScore: number, monthlyLevel: number, alltimeLevel: number}) {
        super();
        if (params) {
            this.id = params.id;
            this.blurrytokens = params.blurrytokens || 0;
            this.steals = params.steals || 0;
            this.blocks = params.blocks || 0;
            this.ingots = params.ingots || 0;
            this.trophies = params.trophies || 0;
            this.credits = params.credits || 0;
            this.lastDaily = params.lastDaily || 0;
            this.dailyCount = params.dailyCount || 0;
            this.monthlyScore = params.monthlyScore || 0;
            this.alltimeScore = params.alltimeScore || 0;
            this.monthlyLevel = params.monthlyLevel || 0;
            this.alltimeLevel = params.alltimeLevel || 0;

        }
    }
}
