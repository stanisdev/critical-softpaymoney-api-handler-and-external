import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import DatabaseLogger from 'src/common/providers/logger/database.logger';
import {
    DatabaseLogType,
    HandlerDestination,
    IncomingRequestStatus,
    PaymentSystem,
} from 'src/common/enums/general';
import { GazpromCompletionWebhook } from 'src/common/providers/webhook/gazprom/gazprom-completion.webhook';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { incomingRequestRepository } from 'src/database/repositories';
import { HandlerHelper } from './handler.helper';
import { GazpromPreparationWebhook } from 'src/common/providers/webhook/gazprom/gazprom-preparation.webhook';

@Injectable()
export class HandlerService {
    private databaseLogger = DatabaseLogger.getInstance();

    constructor(private readonly helper: HandlerHelper) {}

    /**
     * Process incoming request
     */
    async process(incomingRequestId: number): Promise<void | never> {
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
        await incomingRequestRepository
            .createQueryBuilder()
            .update()
            .set({
                status: IncomingRequestStatus.Received,
            })
            .where('id = :id', { id: incomingRequestId })
            .execute();
        incomingRequest.status = IncomingRequestStatus.Received;
        // ------------- REMOVE CONSTRUCTON ABOVE -------------

        /**
         * Incoming request already processed or failed
         */
        if (incomingRequest.status !== IncomingRequestStatus.Received) {
            const logPayload = {
                id: incomingRequestId,
                status: incomingRequest.status,
                paymentSystem: incomingRequest.paymentSystem,
            };
            await this.databaseLogger.write(
                DatabaseLogType.IncomingRequestProcessedOrFailed,
                logPayload,
            );
            throw new BadRequestException(
                `Incoming request id='${incomingRequestId}' is already processed or failed`,
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
                const completionWebhook = new GazpromCompletionWebhook(
                    incomingRequest,
                );
                await completionWebhook.execute();
                const executionResult = completionWebhook.getExecutionResult();

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
            } else if (handlerDestination === HandlerDestination.Preparation) {
                /**
                 * Preparation handler destination
                 */
                const preparationWebhook = new GazpromPreparationWebhook(
                    incomingRequest,
                );
                await preparationWebhook.execute();
            } else {
                /**
                 * Wrong handler destination
                 */
                throw new InternalServerErrorException(
                    'Unknown handler destination',
                );
            }
            return;
        }
        /**
         * Log the error if unknown payment system has been passed
         */
        await this.helper.claimUnknownPaymentSystem(incomingRequest);
    }
}
