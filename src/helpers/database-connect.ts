import "reflect-metadata";
import { Connection, createConnection } from "typeorm";

// Returns a connection to the database
export const connectToDatabase = async (): Promise<Connection> => {
    const connection = await createConnection();

    return connection;
};
