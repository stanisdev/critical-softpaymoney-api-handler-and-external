import {
    DatabaseLogType,
    OrderStatus,
    PaymentSystem,
} from 'src/common/enums/general';
import { ExternalInteractionDataSource } from 'src/modules/external-interaction/external-interaction.data-source';
import { GetCourseClient } from './get-course.client';
import DatabaseLogger from '../logger/database.logger';

export class GetCourseExecutor {
    private static databaseLogger = DatabaseLogger.getInstance();

    constructor(private dataSource: ExternalInteractionDataSource) {}

    /**
     * Run the process of interaction with GetCourse
     */
    async run(): Promise<void> {
        const { order, product: productDbInstance } = this.dataSource;

        if (
            order instanceof Object &&
            order.status === OrderStatus.Confirmed &&
            Number.isInteger(+order.payment?.amount) &&
            order.paidAt &&
            typeof order.email === 'string' &&
            typeof order.payer === 'string' &&
            productDbInstance.getcourse.status === true &&
            typeof productDbInstance.getcourse.url === 'string' &&
            typeof productDbInstance.getcourse.api === 'string' &&
            typeof productDbInstance.getcourse.product === 'string'
        ) {
            /**
             * Create date 14 days ago
             */
            const pastDate = new Date(+new Date(order.paidAt) - 1209600000);
            const day = String(pastDate.getDate()).padStart(2, '0');
            const month = String(pastDate.getMonth() + 1).padStart(2, '0');
            const year = String(pastDate.getFullYear());

            const date = `${year}-${month}-${day}`; // Example: 2023-12-31

            const getCourseProductName = productDbInstance.getcourse.product;
            const { url } = productDbInstance.getcourse;
            const { api: apiKey } = productDbInstance.getcourse;
            const { email, payer } = order;
            const { amount } = order.payment;

            let currency: string;
            if (
                order.payment.type === PaymentSystem.Gazprom ||
                order.payment.type === PaymentSystem.Tinkoff
            ) {
                currency = 'RUB';
            } else {
                currency = 'USD';
            }
            const getCourseClient = new GetCourseClient();

            const requestResult = await getCourseClient.createNewTransaction(
                url, // example: yourlaw.getcourse.ru
                apiKey, // example: 2cbFUdyTXAk4w5djQfoEMkZim5HLQqgBZYHTYOnItM1DX6MEDCcScx90SUWZoPisZdgaUB4Fw6akcTNEmZHg23ralzW6odz2uwD0Rn6VQ0SqyuzgETD6GggwcwdcPhQ5
                date,
                email, // order->email
                getCourseProductName,
                amount,
                payer, // payer->payer
                currency,
            );
            /**
             * Log the case if transaction has not been created
             */
            if (requestResult?.status !== true) {
                await GetCourseExecutor.databaseLogger.write(
                    DatabaseLogType.GetCourseRequestFailed,
                    {
                        orderId: order._id,
                        productId: productDbInstance._id,
                    },
                );
            }
        }
    }
}
