import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { GazpromCompletionHelper } from './gazprom-completion.helper';
import {
    ContentType,
    OrderStatus,
    PaymentSystem,
    PaymentTransactionType,
    Сurrency,
} from 'src/common/enums/general';
import { isEmpty } from 'lodash';
import { GazpromDataSource } from './gazprom.data-source';
import { GazpromExecutionResult } from './gazprom.execution-result';
import { ExecutionFinalResult } from 'src/common/types/general';
import { WebhookFrame } from 'src/common/interfaces/general';
import { GazpromCertificates } from './gazprom.certificates';
import { GazpromSignatureVerification } from './gazprom.signature-verification';
import { GazpromCompleteTransactionExecutor } from './gazprom-completion.transaction-executor';

/**
 * Class to handle Gazprom bank completion webhook
 */
export class GazpromCompletionWebhook implements WebhookFrame {
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
        /**
         * Find in the documentation: "9.3.2 Регистрация платежа в магазине"
         */
        const { payload } = this.incomingRequest;
        const incomingRequestId = this.incomingRequest.id;

        let cardPan: string | undefined;
        if (!isEmpty(payload['p.maskedPan'])) {
            cardPan = <string>payload['p.maskedPan'];
        }

        const merchIdCredential = this.incomingRequest.payload['merch_id'];
        const certificateContent =
            GazpromCertificates.getCertificateByName(merchIdCredential);

        await this.helper.validateCertificateContent(certificateContent);

        /**
         * Signature verification.
         */
        const gazpromSignatureVerification = new GazpromSignatureVerification(
            this.incomingRequest,
            certificateContent,
        );
        /**
         * @todo
         * @important
         * UNCOMMENT THE LINE BELOW
         */
        await gazpromSignatureVerification.verify();

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
        const productOwnerBalance = await this.dataSource.findUserBalance(
            product.user,
            Сurrency.Rub,
        );

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

        /**
         * Execute the main transaction of successfully paid order
         */
        const isProductPaidRecurrently = product.recurrent?.status === true;
        const { incomingRequest } = this;

        await new GazpromCompleteTransactionExecutor({
            orderInstance: order,
            productInstance: product,
            productOwner,
            productOwnerBalance,
            orderRecord,
            paymentTransactionRecord,
            incomingRequest,
            isProductPaidRecurrently,
        }).execute();

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
     * Get final result
     */
    getFinalResult(): ExecutionFinalResult {
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
