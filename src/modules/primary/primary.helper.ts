import HttpMethod from 'http-method-enum';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import {
    handlerPortRepository,
    incomingRequestRepository,
} from 'src/database/repositories';
import {
    DatabaseLogType,
    HandlerDestination,
    IncomingRequestStatus,
    PaymentSystem,
} from 'src/common/enums/general';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { Dictionary } from 'src/common/types/general';
import { HttpClient } from 'src/common/providers/httpClient';
import { typeOrmDataSource } from 'src/database/data-source';
import DatabaseLogger from 'src/common/providers/logger/database.logger';
import config from 'src/common/config';

export class PrimaryHelper {
    private incomingRequestInstance: IncomingRequestEntity;
    private databaseLogger = DatabaseLogger.getInstance();
    private handlerPorts: number[];

    isIncomingRequestProcessed: boolean;

    constructor(
        private requestPayload: string,
        private paymentSystem: PaymentSystem,
        private handlerDestination: HandlerDestination,
    ) {}

    /**
     * Check whether a webhook was received twice
     */
    async isDoubleRequest(inputData: Dictionary): Promise<boolean> {
        if (this.paymentSystem === PaymentSystem.Gazprom) {
            const { handlerDestination } = this;
            let orderPaymentId = <string>inputData['o.CustomerKey'];

            try {
                /**
                 * A light protection from SQL injections
                 */
                orderPaymentId = orderPaymentId.split(' ').join('');
            } catch {}

            const foundResult = await incomingRequestRepository
                .createQueryBuilder('ir')
                .select(['ir.id'])
                .where(`ir.payload @> '{"o.CustomerKey":"${orderPaymentId}"}'`)
                .andWhere('ir.handlerDestination = :handlerDestination', {
                    handlerDestination,
                })
                .getOne();

            return foundResult instanceof IncomingRequestEntity;
        }
        return false;
    }

    /**
     * Process incoming request
     */
    async execute() {
        await this.saveIncomingRequestInPostgres();
        await this.setListOfHandlerPorts();
        await this.sendRequestToHandler();
    }

    /**
     * Send HTTP request to a handler server
     */
    private async sendRequestToHandler(): Promise<void> {
        const requestBody = {
            incomingRequestId: this.incomingRequestInstance.id,
        };

        for (let index = 0; index < this.handlerPorts.length; index++) {
            const port = this.handlerPorts[index];
            const url = `http://localhost:${port}/handler`;

            const httpClient = new HttpClient({
                url,
                body: requestBody,
                method: HttpMethod.POST,
                timeout: config.timeout.handler,
            });
            const requestResult = await httpClient.sendRequest();

            /**
             * If incoming request has been processed successfully
             */
            if (
                requestResult.ok === true &&
                requestResult?.statusCode === HttpStatus.OK
            ) {
                const incomingRequestStatus =
                    await this.getIncomingRequestStatus();

                if (incomingRequestStatus === IncomingRequestStatus.Processed) {
                    this.isIncomingRequestProcessed = true;
                    return;
                }
            } else {
                /**
                 * Request to a nadler server failed
                 */
                const logPayload = {
                    hadlerPort: port,
                    incomingRequestId: this.incomingRequestInstance.id,
                    message: requestResult.message,
                };
                await this.databaseLogger.write(
                    DatabaseLogType.HandlerHasNotProcessedRequest,
                    logPayload,
                );
            }
        }
        this.isIncomingRequestProcessed = false;
    }

    /**
     * Save incoming request in Postgres
     */
    private async saveIncomingRequestInPostgres(): Promise<void> {
        const [result] = await typeOrmDataSource.query(`
            INSERT INTO "IncomingRequests"
                ("payload", "status", "paymentSystem", "handlerDestination", "createdAt", "updatedAt")
            VALUES (
                '${this.requestPayload}',
                'RECEIVED',
                'GAZPROM',
                '${this.handlerDestination}',
                DEFAULT,
                DEFAULT
            ) RETURNING "id"
        `);
        this.incomingRequestInstance = new IncomingRequestEntity();
        this.incomingRequestInstance.id = result.id;
    }

    /**
     * Set list of available handler ports
     */
    private async setListOfHandlerPorts(): Promise<void> {
        const handlerPorts = await handlerPortRepository
            .createQueryBuilder('hp')
            .orderBy('hp.value', 'ASC')
            .select(['hp.value'])
            .getMany();

        if (Array.isArray(handlerPorts) && handlerPorts.length > 0) {
            this.handlerPorts = handlerPorts.map((port) => port.value);
        } else {
            /**
             * If there are no any records in DB
             * @notice this situation can appear very rarely
             */
            const ports: number[] = [];
            for (let index = 0; index < 10; index++) {
                const port = config.server.port.handler + index;
                ports.push(port);
            }
            this.handlerPorts = ports;
        }
    }

    /**
     * Get incoming request status
     */
    private async getIncomingRequestStatus(): Promise<IncomingRequestStatus> {
        const incomingRequest = await incomingRequestRepository
            .createQueryBuilder('ir')
            .where('ir.id = :id', { id: this.incomingRequestInstance.id })
            .select(['ir.status'])
            .limit(1)
            .getOne();
        return incomingRequest.status;
    }

    /**
     * Update incoming request status in DB
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
            .where('id = :id', { id: this.incomingRequestInstance.id })
            .execute();
    }

    /**
     * If the server received a webhook duplicate
     */
    async claimDoubleRequest(inputData: Dictionary): Promise<void> {
        await this.databaseLogger.write(
            DatabaseLogType.DuplicateIncomingRequest,
            inputData,
        );
        throw new BadRequestException(
            'Order with such ID has been already sent',
        );
    }
}
