import { recurrentPaymentsQueueRepository } from '../../../database/repositories';
import { IndependentScript } from '../../interfaces/general';
import { RecurrentPaymentsQueueEntity } from 'src/database/entities/recurrentPaymentsQueue.entity';
import { RecurrentPaymentsHelper } from './recurrent-payments.helper';

export class RecurrentPaymentsExecutor implements IndependentScript {
    /**
     * Run the process
     */
    async execute(): Promise<void> {
        const recordsTotalAmount = await recurrentPaymentsQueueRepository
            .createQueryBuilder()
            .getCount();

        /**
         * Loop processing all records from the queue
         */
        for (let index = 0; index < recordsTotalAmount; index++) {
            const recurrentPaymentsQueueRecord =
                await recurrentPaymentsQueueRepository
                    .createQueryBuilder()
                    .offset(index)
                    .limit(1)
                    .getOne();

            if (
                !(
                    recurrentPaymentsQueueRecord instanceof
                    RecurrentPaymentsQueueEntity
                )
            ) {
                continue;
            }
            /**
             * Check date
             */
            if (
                Date.now() >=
                new Date(recurrentPaymentsQueueRecord.dateToExecute).getTime()
            ) {
                const helper = new RecurrentPaymentsHelper(
                    recurrentPaymentsQueueRecord,
                );
                await helper.processRecurrentPaymentsQueueRecord();

                if (!helper.isItAllowableToProceedExecution) {
                    continue;
                }
                await helper.createOrder();
                helper.buildPaymentUrl();
                await helper.initiatePayment();

                if (!helper.isItAllowableToProceedExecution) {
                    continue;
                }
                await helper.deleteRecurrentPaymentsQueueRecord();
            }
        }
    }
}
