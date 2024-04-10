import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { getReasonPhrase as statusCodeToPhrase } from 'http-status-codes';
import { FastifyReply } from 'fastify';
import { isEmpty } from 'lodash';
import { Response } from '../interfaces/general';
import { DatabaseLogType } from '../enums/general';
import DatabaseLogger from '../providers/logger/database.logger';
import RegularLogger from '../providers/logger/regular.logger';
import config from 'src/common/config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private databaseLogger = DatabaseLogger.getInstance();
    private regularLogger = RegularLogger.getInstance();

    /**
     * Catch an exception
     */
    async catch(exception: HttpException, host: ArgumentsHost): Promise<void> {
        const ctx = host.switchToHttp();
        const fastifyResponse = ctx.getResponse<FastifyReply>();

        let finalResponse: Response<null>;
        let statusCode: number;

        /**
         * Nest based exception (usually 400 or 404)
         */
        if (
            exception instanceof Object &&
            typeof exception.getStatus === 'function'
        ) {
            const status = exception.getStatus();

            let errorMessage: string | string[];

            if (
                exception instanceof Object &&
                typeof exception.getResponse === 'function'
            ) {
                const errorInstance = exception.getResponse();

                if (
                    errorInstance instanceof Object &&
                    'message' in errorInstance &&
                    (typeof errorInstance.message === 'string' ||
                        Array.isArray(errorInstance.message))
                ) {
                    errorMessage = errorInstance.message;
                }
            }
            if (
                [HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS].includes(
                    status,
                )
            ) {
                errorMessage = statusCodeToPhrase(status);
            }
            if (isEmpty(errorMessage)) {
                errorMessage = 'Unknown exception';
            }

            statusCode = status;
            finalResponse = {
                statusCode,
                message: errorMessage,
            };
        } else {
            /**
             * Unknown error
             */
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            finalResponse = {
                statusCode,
                message: statusCodeToPhrase(statusCode),
            };
            if (config.environment.isDev()) {
                console.error(exception);
            }
            /**
             * This catched error needs to be stored in DB logs
             */
            if (exception instanceof Error) {
                const payload = {
                    message: exception.message,
                    stack: exception.stack,
                };
                try {
                    await this.databaseLogger.write(
                        DatabaseLogType.ServerError,
                        payload,
                    );
                } catch (failedDbWriting) {
                    this.regularLogger.error(
                        failedDbWriting,
                        'Unable to write log info in the database',
                    );
                }
            }
        }
        fastifyResponse.status(statusCode).send(finalResponse);
    }
}
