import {
    BadRequestException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { HttpClient } from 'src/common/providers/httpClient';
import { Dictionary } from 'src/common/types/general';
import DatabaseLogger from 'src/common/providers/logger/database.logger';
import config from 'src/common/config';
import HTTPMethod from 'http-method-enum';
import { DatabaseLogType } from 'src/common/enums/general';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';

@Injectable()
export class HandlerHelper {
    private static databaseLogger = DatabaseLogger.getInstance();

    /**
     * Send data to external interaction server
     */
    async sendDataToExternalInteractionServer(
        dataToSend: Dictionary,
    ): Promise<void> {
        const port = config.server.port.externalInteraction;
        const url = `http://localhost:${port}/external-interaction`;

        const httpClient = new HttpClient({
            url,
            body: dataToSend,
            method: HTTPMethod.POST,
            timeout: config.timeout.externalInteraction,
        });
        const requestResult = await httpClient.sendRequest();

        if (
            requestResult.ok !== true &&
            requestResult.statusCode !== HttpStatus.OK
        ) {
            await HandlerHelper.databaseLogger.write(
                DatabaseLogType.ExternalInteractionRequestFailed,
                {
                    url,
                    body: dataToSend,
                    requestResult,
                },
            );
        }
    }

    /**
     * Log the error if unknown payment system has been passed
     */
    async claimUnknownPaymentSystem(
        incomingRequest: IncomingRequestEntity,
    ): Promise<void> {
        const logPayload = {
            id: incomingRequest.id,
            paymentSystem: incomingRequest.paymentSystem,
        };
        await HandlerHelper.databaseLogger.write(
            DatabaseLogType.UnknownPaymentSystem,
            logPayload,
        );
        throw new InternalServerErrorException(
            `Unknown payment system '${incomingRequest.paymentSystem}'`,
        );
    }

    /**
     * Incoming request not found; log the error
     */
    async claimIncomingRequestNotFound(
        incomingRequestId: number,
    ): Promise<void> {
        const logPayload = {
            id: incomingRequestId,
        };
        await HandlerHelper.databaseLogger.write(
            DatabaseLogType.IncomingRequestNotFound,
            logPayload,
        );
        throw new BadRequestException(
            `Incoming request id='${incomingRequestId}' is not found`,
        );
    }

    /**
     * Unacceptable status of incoming request, throw an error
     */
    async claimUnacceptableIncomingRequestStatus(
        incomingRequest: IncomingRequestEntity,
    ): Promise<void> {
        const logPayload = {
            id: incomingRequest.id,
            status: incomingRequest.status,
            paymentSystem: incomingRequest.paymentSystem,
        };
        await HandlerHelper.databaseLogger.write(
            DatabaseLogType.IncomingRequestProcessedOrFailed,
            logPayload,
        );
        throw new BadRequestException(
            `Incoming request id='${incomingRequest.id}' is already processed or failed`,
        );
    }
}
