import "reflect-metadata";
import { Connection, createConnection } from "typeorm";

// Returns a connection to the database
export const connectToDatabase = async (): Promise<Connection> => {
    const connection = await createConnection();

    await connection.manager.query("PRAGMA journal_mode=WAL;");
    await connection.manager.query("PRAGMA busy_timeout=10000;");

    return connection;
};
