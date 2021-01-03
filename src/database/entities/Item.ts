import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

@Entity()
export class Item extends BaseEntity {
    @PrimaryGeneratedColumn()
    c: number;

    @Column("text")
    id: string;

    @Column("text")
    title: string;

    @Column("text")
    type: string;

    @Column("text", { nullable: true })
    data?: string;

    @Column("int")
    time: number;

    constructor(params: { id: string; title: string; type: string; data?: string; time?: number }) {
        super();
        if (params) {
            this.id = params.id;
            this.title = params.title;
            this.type = params.type;
            this.data = params.data;
            this.time = params.time || Date.now();
        }
    }
}
