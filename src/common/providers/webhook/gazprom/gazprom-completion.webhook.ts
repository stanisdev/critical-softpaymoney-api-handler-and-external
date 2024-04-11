import {
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { MongoClient } from '../../mongoClient';
import { GazpromCompletionHelper } from './gazprom-completion.helper';
import {
    ContentType,
    DatabaseLogType,
    IncomingRequestStatus,
    OrderStatus,
    PaymentSystem,
    PaymentTransactionType,
    Сurrency,
} from 'src/common/enums/general';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { incomingRequestRepository } from 'src/database/repositories';
import { isEmpty } from 'lodash';
import { GazpromDataSource } from './gazprom.data-source';
import { GazpromExecutionResult } from './gazprom.execution-result';
import RegularLogger from '../../logger/regular.logger';
import DatabaseLogger from '../../logger/database.logger';
import config from 'src/common/config';

/**
 * Class to handle Gazprom bank completion webhook
 */
export class GazpromCompletionWebhook {
    // @todo: implement interface 'WebhookFrame'
    private static regularLogger = RegularLogger.getInstance();
    private static databaseLogger = DatabaseLogger.getInstance();
    private static certificates = {
        signatureVerification: '',
    };
    private mongoClient = MongoClient.getInstance().database;
    private helper: GazpromCompletionHelper;
    private dataSource: GazpromDataSource;
    private executionResult: GazpromExecutionResult;

    constructor(private readonly incomingRequest: IncomingRequestEntity) {
        this.helper = new GazpromCompletionHelper(incomingRequest);
        this.dataSource = new GazpromDataSource(incomingRequest);
    }

    /**
     * Start processing the incoming request
     */
    async execute(): Promise<void> {
        const { payload } = this.incomingRequest;
        const incomingRequestId = this.incomingRequest.id;

        let cardPan: string | undefined;
        if (!isEmpty(payload['p.maskedPan'])) {
            cardPan = <string>payload['p.maskedPan'];
        }

        /**
         * Signature verification.
         * @notice
         * @todo
         * Need to be completed
         */
        const url = '?';
        const signature = '?';
        let isSignatureCorrect: boolean;
        try {
            isSignatureCorrect = this.helper.isSignatureCorrect(
                signature,
                url,
                GazpromCompletionWebhook.certificates.signatureVerification,
            );
        } catch {
            /**
             * @todo: replace by 'false'
             */
            isSignatureCorrect = true; // <---- @todo: replace by 'false'
        }
        if (!isSignatureCorrect) {
            /**
             * Sugnature is incorrect
             */
            await incomingRequestRepository
                .createQueryBuilder()
                .update()
                .set({
                    status: IncomingRequestStatus.Failed,
                })
                .where('id = :id', { id: this.incomingRequest.id })
                .execute();

            await GazpromCompletionWebhook.databaseLogger.write(
                DatabaseLogType.GazpromSignatureIsIncorrect,
                {
                    incomingRequestId,
                },
            );
            throw new BadRequestException('Signature is incorrect');
        }

        const orderPaymentId = payload['o.CustomerKey'];

        /**
         * Find order in MongoDB
         */
        const order = await this.dataSource.findOrderByPaymentId(
            <string>orderPaymentId,
        );

        /**
         * Find product in MongoDB
         */
        const product = await this.dataSource.findProductById(order.product);

        /**
         * Find user owning the product
         */
        const productOwner = await this.dataSource.findProductOwnerById(
            product.user,
        );

        /**
         * Get order amount (price)
         */
        const inputAmount = await this.helper.parsePayloadAmount(
            <string>payload['amount'],
            incomingRequestId,
        );

        const commissionPercents =
            this.helper.getUserCommissionPercents(productOwner);

        /**
         * Get amount in Ruble
         *
         * "inputAmount" - originally in kopecks
         */
        const untouchedAmount = inputAmount / 100;
        const commissionSubtractedAmount = Math.floor(
            this.helper.subtractCommissionFromAmount(
                untouchedAmount,
                commissionPercents / 100,
                order.commission,
            ),
        );

        this.helper.checkOrderPaymentCorrectness(order, product);

        /**
         * If order was rejected
         */
        if (String(payload['result_code']) === '2') {
            const paymentTransactionRecordPostgres = {
                userId: String(productOwner._id),
                productId: String(order.product),
                amount: commissionSubtractedAmount,
                orderId: String(order._id),
                type: PaymentTransactionType.Receiving,
            };
            if (typeof cardPan === 'string') {
                paymentTransactionRecordPostgres['pan'] = cardPan;
            }
            const orderRecord = {
                mongoOrderId: String(order._id),
                mongoProductId: String(order.product),
                paymentId: order.payment.id,
                paymentSystem: PaymentSystem.Gazprom,
                paymentAmount: order.payment.amount,
                status: OrderStatus.Rejected,
            };
            await this.helper.completeRejectedOrderInPostgres({
                orderRecord,
                paymentTransactionRecord: paymentTransactionRecordPostgres,
                incomingRequestId,
            });
            /**
             * Update order and create payment transaction in Mongo
             */
            await this.helper.rejectOrderInMongo(order._id);
            const paymentTransactionRecordMongo = {
                type: PaymentTransactionType.Receiving,
                user: productOwner._id,
                product: order.product,
                amount: commissionSubtractedAmount,
                order: order._id,
                pan: '',
            };
            if (typeof cardPan === 'string') {
                paymentTransactionRecordMongo.pan = cardPan;
            }
            await this.helper.insertPaymentTransationInMongo(
                paymentTransactionRecordMongo,
            );
            /**
             * We need to send order metadata to a merchant webhook URL,
             * even if order was rejected
             *
             * So create execution result
             */
            this.executionResult = new GazpromExecutionResult({
                orderProcessed: true,
                orderInstance: order,
                productOwnerInstance: productOwner,
                finalAmount: 0,
                untouchedAmount: 0,
            });
            return;
        }

        /**
         * Calculate royalty
         */
        let finalAmount = commissionSubtractedAmount;
        const royalty = Number.parseFloat(order.royalty);

        if (Number.isInteger(royalty)) {
            finalAmount -= royalty;
        }

        /**
         * Find product owner balance record
         *
         * @todo: move to the helper
         */
        const productOwnerBalance = await this.mongoClient
            .collection('payments')
            .findOne({
                user: product.user,
                type: Сurrency.Rub,
            });
        if (!(productOwnerBalance instanceof Object)) {
            await GazpromCompletionWebhook.databaseLogger.write(
                DatabaseLogType.ProductOwnerBalanceInMongoNotFound,
                {
                    incomingRequestId,
                    'productOwner.id': product.user,
                    currencyType: Сurrency.Rub,
                },
            );
            throw new InternalServerErrorException(
                `Product owner balance not found (id = "${product.user}")`,
            );
        }

        /**
         * All checks completed successfully.
         * Proceed completing order.
         */
        const paymentTransactionRecord = {
            userId: String(productOwner._id),
            productId: String(order.product),
            amount: finalAmount,
            orderId: String(order._id),
            type: PaymentTransactionType.Receiving,
        };
        if (typeof cardPan === 'string') {
            paymentTransactionRecord['pan'] = cardPan;
        }
        const orderRecord = {
            mongoOrderId: String(order._id),
            mongoProductId: String(order.product),
            paymentId: order.payment.id,
            paymentSystem: PaymentSystem.Gazprom,
            paymentAmount: order.payment.amount,
            status: OrderStatus.Confirmed,
            paidAt: new Date(),
            updatedAt: new Date(),
        };
        await this.helper.completePaidOrderInPostgres({
            productOwner,
            productOwnerBalance,
            orderRecord,
            paymentTransactionRecord,
            incomingRequestId,
        });
        /**
         * Update order and create payment transaction in Mongo
         */
        const confirmedOrderRecords = {
            'payment.amount': untouchedAmount,
            status: OrderStatus.Confirmed,
            paidAt: new Date(),
        };

        await this.helper.confirmOrderInMongo(order._id, confirmedOrderRecords);

        const paymentTransactionRecordMongo = {
            type: PaymentTransactionType.Receiving,
            user: productOwner._id,
            product: order.product,
            amount: finalAmount,
            order: order._id,
            pan: '',
        };
        if (typeof cardPan === 'string') {
            paymentTransactionRecordMongo.pan = cardPan;
        }
        await this.helper.insertPaymentTransationInMongo(
            paymentTransactionRecordMongo,
        );

        /**
         * Create execution result
         */
        this.executionResult = new GazpromExecutionResult({
            orderProcessed: true,
            orderInstance: order,
            productOwnerInstance: productOwner,
            finalAmount,
            untouchedAmount,
        });
    }

    /**
     * Get execution result
     */
    getExecutionResult(): GazpromExecutionResult {
        return this.executionResult;
    }

    /**
     * Load certificates from files
     */
    static loadCertificates() {
        const certificateFilePath = join(
            config.dirs.keys,
            'signature',
            config.gazprom.certificateFileName,
        );
        try {
            statSync(certificateFilePath);
        } catch {
            this.regularLogger.error(
                `Cannot read certificate: ${certificateFilePath}`,
            );
            process.exit(1);
        }
        this.certificates.signatureVerification = readFileSync(
            certificateFilePath,
            { encoding: 'utf-8' },
        );
    }

    /**
     * Get successful response object
     */
    static getSuccessfulResponse() {
        return {
            payload: [
                {
                    'register-payment-response': [
                        { result: [{ code: 1 }, { desc: 'accept payment' }] },
                    ],
                },
            ],
            contentType: ContentType.Xml,
        };
    }
}
