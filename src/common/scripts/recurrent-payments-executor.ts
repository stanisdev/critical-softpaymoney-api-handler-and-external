import { ObjectId } from 'mongodb';
import { recurrentPaymentsQueueRepository } from '../../database/repositories';
import { IndependentScript } from '../interfaces/general';
import { MongoClient } from '../providers/mongoClient';

export class RecurrentPaymentsExecutor implements IndependentScript {
    private mongoClient = MongoClient.getInstance().database;

    /**
     * Run the process
     */
    async execute(): Promise<void> {
        const databaseRecords = await recurrentPaymentsQueueRepository
            .createQueryBuilder()
            .limit(10)
            .offset(0)
            .getMany();

        for (let index = 0; index < databaseRecords.length; index++) {
            const databaseRecord = databaseRecords[index];
            const trxId = databaseRecord.metadata['trxId'];

            const productMongoInstance = await this.mongoClient
                .collection('products')
                .findOne({
                    _id: new ObjectId(databaseRecord.productIdMongo),
                });
            if (productMongoInstance.recurrent?.status !== true) {
                continue;
            }
        }
    }
}
