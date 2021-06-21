import { database as db } from "configuration/secrets.json";
import { ConnectionOptions } from "typeorm";

const config: ConnectionOptions = {
    type: "mongodb",
    url: `mongodb+srv://${db.username}:${db.password}@${db.cluster}/myFirstDatabase?retryWrites=true&w=majority`,
    ssl: true,
    authSource: "admin",
    useNewUrlParser: true,
    useUnifiedTopology: true,

    synchronize: false,
    logging: false,
    entities: ["./src/database/entities/*.ts"],
    migrations: ["./src/database/migrations/*.ts"],
    cli: { migrationsDir: "src/database/migrations" }
};

export = config;
