import "reflect-metadata";
import { Connection, createConnection } from "typeorm";

// Returns a connection to the database
export const connectToDatabase = async (connection: Connection): Promise<void> => {
    connection = await createConnection({
        type: "sqlite",
        database: "discord.sqlite",
        synchronize: true,
        logging: false,
        entities: ["src/database/entity/*.ts"]
    });

    await connection.manager.query("PRAGMA journal_mode=WAL;");
    await connection.manager.query("PRAGMA busy_timeout=10000;");
};
