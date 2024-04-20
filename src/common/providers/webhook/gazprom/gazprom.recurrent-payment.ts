import * as moment from 'moment';
import { GazpromPaymentStatus, PaymentSystem } from 'src/common/enums/general';
import { Dictionary, MongoDocument } from 'src/common/types/general';
import { EntityManager } from 'typeorm';

export class GazpromRecurrentPayment {
    constructor(
        private readonly productMongoInstance: MongoDocument,
        /**
         * payload - это значение, которое берется из поля 'payload',
         * запись таблицы 'IncomingRequest'
         */
        private readonly payload: string,
        private readonly transactionalEntityManager: EntityManager,
    ) {}

    /**
     * Define the next payment in the future
     */
    async setSchedule(): Promise<void> {
        const metadata = {
            trxId: this.payload['trx_id'],
        };
        const recurrentPeriod = Number(
            this.productMongoInstance.recurrent?.period,
        );
        const dateToExecute = moment()
            .add(recurrentPeriod, 'days')
            .format('YYYY-MM-DD HH:mm:ss');

        /**
         * Если пришёл вебхук при самой первой оплате, то payload['o.PaymentStatus'] = new
         * значит так мы поймем, что следующий рекуррентные платёж будет относится к 'first period'
         * (если тот, конечно, ещё определён в записи product).
         * -----------------
         *
         * Если пришёл вебхук с payload['o.PaymentStatus'] = auto, значит в любом случае первый период уже пройден.
         */
        let isFirstPeriod: boolean;
        if (this.payload['o.PaymentStatus'] === GazpromPaymentStatus.New) {
            isFirstPeriod = false;
        } else {
            isFirstPeriod = true;
        }

        const recurrentPaymentsQueueRecord = {
            dateToExecute,
            isFirstPeriod,
            productIdMongo: String(this.productMongoInstance._id),
            paymentSystem: PaymentSystem.Gazprom,
            metadata: JSON.stringify(metadata),
        };
        await this.addRecordToRecurrentPaymentsQueue(
            recurrentPaymentsQueueRecord,
        );
    }

    /**
     * Add record to recurrent payments queue
     */
    private async addRecordToRecurrentPaymentsQueue(
        recurrentPaymentsQueueRecord: Dictionary,
    ): Promise<void> {
        const query = `
            INSERT INTO "RecurrentPaymentsQueue"
                ("dateToExecute", "isFirstPeriod", "productIdMongo", "paymentSystem", "metadata", "createdAt")
            VALUES
                (
                    '${recurrentPaymentsQueueRecord.dateToExecute}',
                    ${recurrentPaymentsQueueRecord.isFirstPeriod},
                    '${recurrentPaymentsQueueRecord.productIdMongo}',
                    '${recurrentPaymentsQueueRecord.paymentSystem}',
                    '${recurrentPaymentsQueueRecord.metadata}',
                    DEFAULT
                );
        `;
        await this.transactionalEntityManager.query(query);
    }
}
