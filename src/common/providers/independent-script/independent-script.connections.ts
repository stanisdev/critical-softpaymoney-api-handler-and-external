import { typeOrmDataSource } from '../../../database/data-source';
import { MongoClient } from '../mongo-client';
import RegularLogger from '../logger/regular.logger';

export async function connectExternalDataStorages() {
    const regularLogger = RegularLogger.getInstance();

    try {
        await typeOrmDataSource.initialize();
    } catch (postgresConnectionError) {
        regularLogger.log('Cannot connect to Postgres');
        regularLogger.error(postgresConnectionError);
        process.exit(1);
    }
    regularLogger.log('Postgres connected');

    try {
        await MongoClient.getInstance().connect();
    } catch (mongoConnectionError) {
        regularLogger.log('Cannot connect to Mongo');
        regularLogger.error(mongoConnectionError);
        process.exit(1);
    }
    regularLogger.log('Mongo connected');
}
