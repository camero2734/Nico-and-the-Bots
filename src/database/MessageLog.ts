import {Entity, Column, PrimaryColumn, BaseEntity, Index, Unique} from "typeorm";

@Entity()
@Index(["user_id", "message_id"])
export class MessageLog extends BaseEntity {
    @Column("text")
    user_id: string;

    @Column("text")
    channel_id: string;

    @PrimaryColumn("text")
    message_id: string;

    @Column("int")
    time: number;

    constructor(params: { user_id: string, channel_id: string, message_id: string, time: number }) {
        super();
        if (params) {
            this.user_id = params.user_id;
            this.channel_id = params.channel_id;
            this.message_id = params.message_id;
            this.time = params.time || Date.now();
        }
    }
}
