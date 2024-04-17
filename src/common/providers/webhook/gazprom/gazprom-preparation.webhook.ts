import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { Dictionary, ExecutionFinalResult } from 'src/common/types/general';
import { BadRequestException } from '@nestjs/common';
import { GazpromDataSource } from './gazprom.data-source';
import {
    ContentType,
    GazpromPaymentStatus,
    IncomingRequestStatus,
    OrderStatus,
} from 'src/common/enums/general';
import { WebhookFrame } from 'src/common/interfaces/general';
import { incomingRequestRepository } from 'src/database/repositories';
import { GazpromRepository } from './gazprom-preparation.repository';
import { GazpromPreparationHelper } from './gazprom-preparation.helper';
import config from 'src/common/config';

export class GazpromPreparationWebhook implements WebhookFrame {
    private dataSource: GazpromDataSource;
    private finalResult: ExecutionFinalResult;
    private repository = new GazpromRepository();
    private helper = new GazpromPreparationHelper();

    constructor(private readonly incomingRequest: IncomingRequestEntity) {
        this.dataSource = new GazpromDataSource(incomingRequest);
    }

    /**
     * Start processing the incoming request
     */
    async execute(): Promise<void> {
        const { payload } = this.incomingRequest;
        const orderPaymentId = payload['o.CustomerKey'];

        this.validatePaymentStatus();

        /**
         * Find order in MongoDB
         */
        const order = await this.dataSource.findOrderByPaymentId(
            <string>orderPaymentId,
        );

        if (order.status !== OrderStatus.Created) {
            await this.helper.claimIncorrectOrderStatus(order._id);
        }

        if (!Number.isInteger(order?.payment?.amount)) {
            /**
             * @todo improve this code
             * @add database logging
             */
            throw new BadRequestException(
                'Order has incorrect "payment.amount" value',
            );
        }
        const product = await this.dataSource.findProductById(order.product);

        /**
         * Save 'trx_id' in 'order.payment.trxId'
         */
        const trxId = payload['trx_id'];
        if (typeof trxId === 'string' && trxId.length > 1) {
            await this.repository.updateOrderPaymentTrxIdById(order._id, trxId);
        }
        const payloadData: Dictionary = {
            code: 1,
            desc: 'Payment is available',
            longDesc: `Оплата продукта: "${product.name}"`,
            amount: Number(order.payment.amount),
            currency: 643, // Трехзначный цифровой код валюты (ISO 4217)
            exponent: 2, // Экспонента валюты платежа (ISO 4217)
            trxId,
        };
        /**
         * Define final result
         */
        const responseData = [];

        responseData.push({
            result: [{ code: payloadData.code }, { desc: payloadData.desc }],
        });

        if (payloadData.code === 1 && Number.isInteger(payloadData.amount)) {
            /**
             * purchase.account-amount.id - Идентификатор счета в системе магазина. Возвращается в запросе регистрации платежа (RPReq) в исходном виде
             * purchase.account-amount.amount - Сумма платежа в минорных единицах
             */
            responseData.push({
                purchase: [
                    { longDesc: payloadData.longDesc }, // "Проверка доступности платежа в магазине" - сделай поиск по документации
                    {
                        'account-amount': [
                            { id: config.gazprom.accountId },
                            { amount: +payloadData.amount * 100 },
                            { currency: payloadData.currency },
                            { exponent: payloadData.exponent },
                        ],
                    },
                ],
            });
            if (payload['o.PaymentStatus'] === GazpromPaymentStatus.Auto) {
                /**
                 * card - Описание ранее зарегистрированной карты или ранее проведённой транзакции
                 * card.id - Идентификатор банковской карты, которая должна использоваться в платеже
                 * card.trx-id - Идентификатор транзакции, из которой необходимо брать параметры банковской карты
                 * card.present - Идентификатор типа платежа. Параметр может принимать следующие значения:
                 *                  Y – обычный платеж без повторного ввода параметров карты (по умолчанию)
                 *                  N – рекуррентный платеж
                 */
                responseData.push({
                    card: [{ 'trx-id': payloadData.trxId }, { present: 'N' }],
                });
            }
        }
        this.finalResult = {
            payload: [
                { 'payment-avail-response': responseData }, // Стр. 50 из 64 - Документация (v1_32)
            ],
            contentType: ContentType.Xml,
        };
    }

    /**
     * Get final result of execution
     */
    getFinalResult(): ExecutionFinalResult {
        return this.finalResult;
    }

    /**
     * Validate payment status
     */
    validatePaymentStatus(): void | never {
        const isPaymentStatusCorrect = [
            GazpromPaymentStatus.New,
            GazpromPaymentStatus.Auto,
        ].includes(this.incomingRequest.payload['o.PaymentStatus']);
        if (!isPaymentStatusCorrect) {
            throw new BadRequestException('Unacceptable payment status');
        }
    }

    /**
     * Update incoming request status
     */
    async updateIncomingRequestStatus(
        status: IncomingRequestStatus,
    ): Promise<void> {
        await incomingRequestRepository
            .createQueryBuilder()
            .update()
            .set({
                status,
            })
            .where('id = :id', { id: this.incomingRequest.id })
            .execute();
    }
}
