import {Entity, Column, PrimaryColumn, BaseEntity} from "typeorm";

@Entity()
export class LevelToken extends BaseEntity {
    @PrimaryColumn("text")
    id: string;

    @Column("int")
    value: number;

    @Column("int")
    lastLevel: number;

    constructor(params: { id: string, value: number, lastLevel: number }) {
        super();
        if (params) {
            this.id = params.id;
            this.value = params.value || 0;
            this.lastLevel = params.lastLevel || 0;
        }
    }
}
