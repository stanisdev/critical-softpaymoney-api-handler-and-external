import { ExternalInteractionDataSource } from 'src/modules/external-interaction/external-interaction.data-source';
import { OrderStatus, PaymentSystem } from 'src/common/enums/general';
import { AtolClient } from './atol.client';
import { MongoClient } from '../mongo-client';

export class AtolExecutor {
    private mongoClient = MongoClient.getInstance().database;

    constructor(private dataSource: ExternalInteractionDataSource) {}

    /**
     * Run the process of interaction with atol
     */
    async run(): Promise<void> {
        const { order, product } = this.dataSource;

        /**
         * Validation
         */
        if (
            order.payment.type !== PaymentSystem.Gazprom &&
            order.payment.type !== PaymentSystem.Tinkoff
        ) {
            return;
        }
        if (order.status !== OrderStatus.Confirmed) {
            return;
        }

        /**
         * Define paymentId
         */
        let paymentId: string;
        if (order.payment.type === PaymentSystem.Gazprom) {
            paymentId = order.payment.trx_id;
        } else {
            paymentId = order.payment.id;
        }

        /**
         *  Define rebill
         */
        let rebill: string;
        if (order.recurrent.rebill) {
            rebill = `-${order.recurrent.rebill}`;
        } else {
            rebill = '';
        }

        /**
         * @notice
         * These two constants was taken from the Legacy as is
         */
        const operationId = {
            sell: 'S-',
            sell_refund: 'SR-',
            buy: 'B-',
        };
        const paymentType = {
            GAZPROM: 'G-',
            TINKOFF: 'T-',
        };

        /**
         * @notice
         * @todo
         * This is a workaround and should be modified in the future
         */
        const operationType = 'sell'; // 'sell' or 'buy'

        /**
         * Send HTTP request to atol
         */
        const atolClient = new AtolClient();
        const userContacts = { Email: order.email, Phone: order.phone };
        const productName = product.name;
        const paymentAmount = order.payment.amount;
        /**
         * Example - 'G-S-NBCT5Q1S6E09JH7W'
         */
        const operationPaymentId = `${paymentType[order.payment.type]}${operationId[operationType]}${paymentId}${rebill}`;

        const receipt = await atolClient.CreateOperation(
            operationType,
            operationPaymentId,
            productName,
            paymentAmount,
            userContacts,
        );
        /**
         * receipt
         * Example:
            {
                status: true,
                data: {
                    uuid: '45f66bd9-a5c3-4ad1-a2db-52a2b30ea406',
                    status: 'wait',
                    error: null,
                    timestamp: '03.04.2024 16:33:30'
                },
                success: true,
                message: 'OK'
            }
         */
        /**
         * Handle atol response
         */
        const requestResult = {
            uuid: receipt?.data?.uuid,
            status: receipt?.data?.status,
        };

        if (typeof requestResult.uuid === 'string') {
            const report = await atolClient.getReport(requestResult.uuid);
            requestResult.status = report?.data?.status;
        }
        const fieldsToUpdate = {
            'receipt.uuid': requestResult.uuid ? requestResult.uuid : '',
            'receipt.status': requestResult.status ? requestResult.status : '',
        };
        await this.mongoClient.collection('orders').updateOne(
            { _id: order._id },
            {
                $set: fieldsToUpdate,
            },
        );
    }
}
