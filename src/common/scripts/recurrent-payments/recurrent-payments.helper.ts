import * as randomstring from 'randomstring';
import HTTPMethod from 'http-method-enum';
import config from '../../config';
import DatabaseLogger from 'src/common/providers/logger/database.logger';
import { stringify as querystringStringify } from 'node:querystring';
import { ObjectId } from 'mongodb';
import { recurrentPaymentsQueueRepository } from '../../../database/repositories';
import { MongoClient } from '../../providers/mongoClient';
import {
    DatabaseLogType,
    OrderStatus,
    PaymentSystem,
} from '../../enums/general';
import { Dictionary, MongoDocument } from '../../types/general';
import { HttpClient } from '../../providers/httpClient';
import { RecurrentPaymentsQueueEntity } from 'src/database/entities/recurrentPaymentsQueue.entity';

export class RecurrentPaymentsHelper {
    private mongoClient = MongoClient.getInstance().database;
    private orderMongoInstance: MongoDocument;
    private productMongoInstance: MongoDocument;
    private orderRecord: Dictionary;
    private paymentUrl: string;
    private databaseLogger = DatabaseLogger.getInstance();
    public isItAllowableToProceedExecution = false;

    constructor(
        private recurrentPaymentsQueueRecord: RecurrentPaymentsQueueEntity,
    ) {}

    /**
     * Find 'order' and 'product'
     */
    async fillDataSource(): Promise<void> {
        const { recurrentPaymentsQueueRecord } = this;

        /**
         * Find order in Mongo
         */
        this.orderMongoInstance = await this.mongoClient
            .collection('orders')
            .findOne({
                _id: new ObjectId(recurrentPaymentsQueueRecord.orderIdMongo),
            });
        if (!(this.orderMongoInstance instanceof Object)) {
            await this.deleteRecurrentPaymentsQueueRecord();
            return;
        }

        /**
         *  Find product in Mongo
         */
        this.productMongoInstance = await this.findMongoProductById(
            new ObjectId(this.orderMongoInstance.product),
        );
        const { productMongoInstance } = this;
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
            await this.deleteRecurrentPaymentsQueueRecord();
            return;
        }
        this.isItAllowableToProceedExecution = true;
    }

    /**
     * Create order for a recurring payment
     */
    async createOrder(): Promise<void> {
        const trxId = this.recurrentPaymentsQueueRecord.metadata['trxId'];
        const { orderMongoInstance } = this;

        /**
         * Цена на order берется из стоимости продукта
         */
        const orderAmount = this.productMongoInstance.price['GAZPROM'];

        /**
         * Create order in Mongo
         */
        const orderPaymentId = randomstring.generate(32);
        this.orderRecord = {
            ...orderMongoInstance,
            status: OrderStatus.Created,
            payment: {
                id: orderPaymentId,
                trx_id: trxId,
                amount: orderAmount,
                /**
                 * Payment system (Gazprom, Tinkoff etc)
                 */
                type: orderMongoInstance.payment.type,
                commission: orderMongoInstance.payment.commission,
            },
            recurrent: {
                rebill: trxId,
                status: false,
            },
            /**
             * @todo:
             * @do-not-forget
             * Define field 'price' in the parent order
             */
            createdAt: new Date(),
        };
        const { orderRecord } = this;
        delete orderRecord['questions'];
        delete orderRecord['updatedAt'];
        delete orderRecord['paidAt'];
        delete orderRecord['receipt'];
        delete orderRecord['_id'];

        await this.mongoClient.collection('orders').insertOne(orderRecord);
    }

    /**
     * Build payment url
     */
    buildPaymentUrl(): void {
        const { productMongoInstance, orderMongoInstance } = this;
        let successfullPaymentUrl: string;

        if (
            typeof productMongoInstance?.redirect === 'string' &&
            productMongoInstance.redirect.length > 1
        ) {
            successfullPaymentUrl = productMongoInstance.redirect;
        } else {
            successfullPaymentUrl =
                config.miscellaneous.mainUrl +
                '/order/confirmed?order=' +
                orderMongoInstance.payer;
        }

        const queryParams = {
            'o.CustomerKey': orderMongoInstance.payment.id,
            'o.PaymentStatus': 'auto',
            /**
             * @todo: remove this field in production
             */
            'o.TestEnv': 'true',
            lang_code: 'RU',
            merch_id: config.gazprom.merchId,
            back_url_s: successfullPaymentUrl,
            back_url_f: config.gazprom.url.failedPayment,
        };
        const queryParamsString = querystringStringify(queryParams, '&', '=', {
            encodeURIComponent: Object,
        });
        this.paymentUrl = `${config.gazprom.urlToInitiateRecurringPayment}?${queryParamsString}`;
    }

    /**
     * Initiate another recurring payment
     */
    async initiatePayment(): Promise<void> {
        /**
         * Send GET request to Gazprom API
         */
        const httpClient = new HttpClient({
            url: this.paymentUrl,
            body: {},
            method: HTTPMethod.GET,
            timeout: 10000,
        });
        const requestResult = await httpClient.sendRequest();

        /**
         * @notice
         * This is a temporary workaround and should be changed in the future
         */
        if (requestResult.ok !== true) {
            const payload = {
                order: this.orderRecord,
            };
            await this.databaseLogger.write(
                DatabaseLogType.GazpromRecurringPaymentInitiationFailed,
                payload,
            );
            this.isItAllowableToProceedExecution = false;
            return;
        }
    }

    /**
     * Delete record from 'RecurrentPaymentsQueue' table
     */
    async deleteRecurrentPaymentsQueueRecord(): Promise<void> {
        await recurrentPaymentsQueueRepository
            .createQueryBuilder()
            .delete()
            .where('id = :id', {
                id: this.recurrentPaymentsQueueRecord.id,
            })
            .execute();
    }

    /**
     * Find Mongo product by id
     */
    private findMongoProductById(id: ObjectId): Promise<MongoDocument> {
        return this.mongoClient.collection('products').findOne({ _id: id });
    }
}
