import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
    HandlerDestination,
    IncomingRequestStatus,
    PaymentSystem,
} from 'src/common/enums/general';
import { GazpromCompletionWebhook } from 'src/common/providers/webhook/gazprom/gazprom-completion.webhook';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { incomingRequestRepository } from 'src/database/repositories';
import { HandlerHelper } from './handler.helper';
import { GazpromPreparationWebhook } from 'src/common/providers/webhook/gazprom/gazprom-preparation.webhook';
import { ExecutionFinalResult } from 'src/common/types/general';

@Injectable()
export class HandlerService {
    constructor(private readonly helper: HandlerHelper) {}

    /**
     * Process incoming request
     */
    async process(
        incomingRequestId: number,
    ): Promise<ExecutionFinalResult | never> {
        const incomingRequest = await incomingRequestRepository
            .createQueryBuilder()
            .where('id = :id', { id: incomingRequestId })
            .limit(1)
            .getOne();

        if (!(incomingRequest instanceof IncomingRequestEntity)) {
            this.helper.claimIncomingRequestNotFound(incomingRequestId);
        }

        /**
         * @todo
         * @important
         * Remove the temporary construction below
         */
        // await incomingRequestRepository
        //     .createQueryBuilder()
        //     .update()
        //     .set({
        //         status: IncomingRequestStatus.Received,
        //     })
        //     .where('id = :id', { id: incomingRequestId })
        //     .execute();
        // incomingRequest.status = IncomingRequestStatus.Received;
        // ------------- REMOVE CONSTRUCTON ABOVE -------------

        /**
         * Incoming request already processed or failed
         */
        if (incomingRequest.status !== IncomingRequestStatus.Received) {
            await this.helper.claimUnacceptableIncomingRequestStatus(
                incomingRequest,
            );
        }

        /**
         * If payment system is Gazprom
         */
        if (incomingRequest.paymentSystem === PaymentSystem.Gazprom) {
            const { handlerDestination } = incomingRequest;

            /**
             * Completion handler destination
             */
            if (handlerDestination === HandlerDestination.Completion) {
                const gazpromCompletionWebhook = new GazpromCompletionWebhook(
                    incomingRequest,
                );
                await gazpromCompletionWebhook.execute();
                const executionResult =
                    gazpromCompletionWebhook.getExecutionResult();

                if (
                    executionResult instanceof Object &&
                    executionResult.value.orderProcessed === true
                ) {
                    /**
                     * Send order info to external interaction server
                     */
                    const payload = {
                        orderId: executionResult.value.orderInstance._id,
                        productOwnerId:
                            executionResult.value.productOwnerInstance._id,
                        finalAmount: executionResult.value.finalAmount,
                        untouchedAmount: executionResult.value.untouchedAmount,
                    };
                    const externalInteractionData = {
                        paymentSystem: PaymentSystem.Gazprom,
                        payload: JSON.stringify(payload),
                    };

                    try {
                        /**
                         * @note It's not necessary to await the response
                         */
                        this.helper.sendDataToExternalInteractionServer(
                            externalInteractionData,
                        );
                    } catch (error) {
                        /**
                         * @todo: log the case if an error was thrown
                         */
                    }
                }
                return gazpromCompletionWebhook.getFinalResult();

                /**
                 * Preparation handler destination
                 */
            } else if (handlerDestination === HandlerDestination.Preparation) {
                const gazpromPreparationWebhook = new GazpromPreparationWebhook(
                    incomingRequest,
                );
                await gazpromPreparationWebhook.execute();
                await gazpromPreparationWebhook.updateIncomingRequestStatus(
                    IncomingRequestStatus.Processed,
                );

                return gazpromPreparationWebhook.getFinalResult();

                /**
                 * Wrong handler destination
                 */
            } else {
                throw new InternalServerErrorException(
                    'Unknown handler destination',
                );
            }
        }
        /**
         * Log the error if unknown payment system has been passed
         */
        await this.helper.claimUnknownPaymentSystem(incomingRequest);
    }
}
