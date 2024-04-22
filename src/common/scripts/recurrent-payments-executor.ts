import * as randomstring from 'randomstring';
import { ObjectId } from 'mongodb';
import { recurrentPaymentsQueueRepository } from '../../database/repositories';
import { IndependentScript } from '../interfaces/general';
import { MongoClient } from '../providers/mongoClient';
import { PaymentSystem } from '../enums/general';
import { MongoDocument } from '../types/general';
import config from '../config';

export class RecurrentPaymentsExecutor implements IndependentScript {
    private mongoClient = MongoClient.getInstance().database;

    /**
     * Run the process
     */
    async execute(): Promise<void> {
        const databaseRecords = await recurrentPaymentsQueueRepository
            .createQueryBuilder()
            .limit(config.recurrentPayments.recordsPerTime)
            .offset(0)
            .getMany();

        /**
         * Handle Postgres records
         */
        for (let index = 0; index < databaseRecords.length; index++) {
            const databaseRecord = databaseRecords[index];
            const trxId = databaseRecord.metadata['trxId'];

            const productMongoInstance = await this.findProductByIdInMongo(
                new ObjectId(databaseRecord.productIdMongo),
            );

            /**
             *  Check product to be able to create auto payment
             */
            if (
                /**
                 * Продукт не найден или он заблокирован
                 */
                !(productMongoInstance instanceof Object) ||
                productMongoInstance.active !== true ||
                /**
                 * Автоплатежи отключены
                 */
                productMongoInstance.recurrent?.status !== true ||
                /**
                 * Способ оплаты был выключен
                 */
                !Array.isArray(productMongoInstance.paymentType) ||
                !productMongoInstance.paymentType.includes(
                    PaymentSystem[process.env.PAYMENT_SYSTEM],
                )
            ) {
                await this.deleteRecurrentPaymentsQueueRecord(
                    databaseRecord.id,
                );
                continue;
            }

            /**
             * Create order in Mongo
             */
            const orderPaymentId = randomstring.generate(32);
            const orderRecord = {
                payment: {
                    id: orderPaymentId,
                    trx_id: trxId,
                },
                createdAt: new Date(),
            };
            delete orderRecord['questions'];

            await this.mongoClient.collection('orders').insertOne(orderRecord);
        }
    }

    /**
     * Delete record from 'RecurrentPaymentsQueue' table
     */
    private async deleteRecurrentPaymentsQueueRecord(
        id: number,
    ): Promise<void> {
        await recurrentPaymentsQueueRepository
            .createQueryBuilder()
            .delete()
            .where('id = :id', { id })
            .execute();
    }

    /**
     * Find Mongo product by id
     */
    findProductByIdInMongo(id: ObjectId): Promise<MongoDocument> {
        return this.mongoClient.collection('products').findOne({ _id: id });
    }
}
