import { DatabaseLogType } from 'src/common/enums/general';
import { Dictionary } from 'src/common/types/general';
// import { logRepository } from 'src/database/repositories';
import { OpenSearchClient } from '../open-search-client';

export default class DatabaseLogger {
    private static instance: DatabaseLogger | null = null;
    private constructor() {}

    /**
     * Get instance of the class
     */
    static getInstance(): DatabaseLogger {
        if (!(DatabaseLogger.instance instanceof DatabaseLogger)) {
            return (DatabaseLogger.instance = new DatabaseLogger());
        }
        return DatabaseLogger.instance;
    }

    /**
     * Write log data in DB
     */
    async write(type: DatabaseLogType, payload: Dictionary): Promise<void> {
        const logRecord = {
            type,
            payload,
        };
        await OpenSearchClient.insertDocument(logRecord);

        /**
         * Let's remain for the local debugging purposes
         */
        // const logRecord = {
        //     type,
        //     payload: JSON.stringify(payload),
        // };
        // await logRepository
        //     .createQueryBuilder()
        //     .insert()
        //     .values(logRecord)
        //     .execute();
    }
}
