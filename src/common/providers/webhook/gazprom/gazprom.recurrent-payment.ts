import * as moment from 'moment';
import { GazpromPaymentStatus, PaymentSystem } from 'src/common/enums/general';
import { Dictionary, MongoDocument } from 'src/common/types/general';
import { EntityManager } from 'typeorm';

export class GazpromRecurrentPayment {
    private isFirstPeriod: boolean;

    constructor(
        private readonly orderMongoInstance: MongoDocument,
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
        /**
         * Если пришёл вебхук при самой первой оплате, то payload['o.PaymentStatus'] = new
         * значит так мы поймем, что следующий рекуррентный платёж будет относится к 'first period'
         * (если тот, конечно, ещё определён в записи product).
         * -----------------
         *
         * Если пришёл вебхук с payload['o.PaymentStatus'] = auto, значит в любом случае первый период уже пройден.
         */
        if (this.payload['o.PaymentStatus'] === GazpromPaymentStatus.New) {
            this.isFirstPeriod = true;
        } else {
            this.isFirstPeriod = false;
        }

        /**
         * Define date of the next recurrent payment
         */
        const recurrentPeriod = Number(this.getRecurrentPeriod());

        const dateToExecute = moment()
            .add(recurrentPeriod, 'days')
            .format('YYYY-MM-DD HH:mm:ss');

        const recurrentPaymentsQueueRecord = {
            dateToExecute,
            isFirstPeriod: this.isFirstPeriod,
            orderIdMongo: String(this.orderMongoInstance._id),
            paymentSystem: PaymentSystem.Gazprom,
            metadata: JSON.stringify(metadata),
        };
        await this.addRecordToRecurrentPaymentsQueue(
            recurrentPaymentsQueueRecord,
        );
    }

    /**
     * Get recurrent period (first or ordinary)
     */
    private getRecurrentPeriod(): number {
        const { productMongoInstance } = this;
        const recurrentFirstPeriod = productMongoInstance.recurrent.firstPeriod;
        const recurrentPeriod = productMongoInstance.recurrent.period;

        if (
            this.isFirstPeriod &&
            productMongoInstance.recurrent.firstStatus === true &&
            Number.isInteger(recurrentFirstPeriod) &&
            recurrentFirstPeriod > 0
        ) {
            return recurrentFirstPeriod;
        } else {
            return recurrentPeriod;
        }
    }

    /**
     * Add record to recurrent payments queue
     */
    private async addRecordToRecurrentPaymentsQueue(
        recurrentPaymentsQueueRecord: Dictionary,
    ): Promise<void> {
        const query = `
            INSERT INTO "RecurrentPaymentsQueue"
                ("dateToExecute", "isFirstPeriod", "orderIdMongo", "paymentSystem", "metadata", "createdAt")
            VALUES
                (
                    '${recurrentPaymentsQueueRecord.dateToExecute}',
                    ${recurrentPaymentsQueueRecord.isFirstPeriod},
                    '${recurrentPaymentsQueueRecord.orderIdMongo}',
                    '${recurrentPaymentsQueueRecord.paymentSystem}',
                    '${recurrentPaymentsQueueRecord.metadata}',
                    DEFAULT
                );
        `;
        await this.transactionalEntityManager.query(query);
    }
}
