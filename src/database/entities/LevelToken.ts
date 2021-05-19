import { Column, Entity, ObjectIdColumn } from "typeorm";

@Entity()
export class LevelToken {
    @ObjectIdColumn()
    id: string;

    @Column()
    value: number;

    @Column()
    lastLevel: number;

    constructor(params: { id: string; value: number; lastLevel: number }) {
        if (params) {
            this.id = params.id;
            this.value = params.value || 0;
            this.lastLevel = params.lastLevel || 0;
        }
    }
}
