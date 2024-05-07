import { MongoClient as MongoConnection, Db } from 'mongodb';
import { isEmpty } from 'lodash';
import config from 'src/common/config';

export class MongoClient {
    private static instance: MongoClient | null = null;
    private connection: MongoConnection;

    database: Db;

    private constructor() {
        this.buildConnection();
    }
    /**
     * Get instance of the class
     */
    static getInstance(): MongoClient {
        if (!(MongoClient.instance instanceof MongoClient)) {
            return (MongoClient.instance = new MongoClient());
        }
        return MongoClient.instance;
    }
    /**
     * Establish Db connection
     */
    async connect() {
        await this.connection.connect();
        this.database = this.connection.db(config.db.mongo.name);
    }
    /**
     * Create connection instance
     */
    buildConnection(): void {
        let connectionUrl = 'mongodb://';

        if (isEmpty(config.db.mongo.user)) {
            connectionUrl += `${config.db.mongo.host}:${config.db.mongo.port}`;
        } else {
            connectionUrl += `${config.db.mongo.user}:${config.db.mongo.password}@${config.db.mongo.host}:${config.db.mongo.port}/${config.db.mongo.name}`;
        }
        this.connection = new MongoConnection(connectionUrl);
    }
    /**
     * Close Db connection
     */
    async closeConnection() {
        await this.connection.close();
    }
}
