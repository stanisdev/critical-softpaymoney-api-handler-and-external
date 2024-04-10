import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UsePipes,
    InternalServerErrorException,
    Response,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { PaymentSystemValidationPipe } from 'src/common/pipes/payment-system-validation.pipe';
import { HandlerDestinationValidationPipe } from 'src/common/pipes/handler-destination-validation.pipe';
import { PrimaryService } from './primary.service';
import { Dictionary } from 'src/common/types/general';
import {
    HandlerDestination,
    IncomingRequestStatus,
    PaymentSystem,
} from 'src/common/enums/general';

@UsePipes(PaymentSystemValidationPipe, HandlerDestinationValidationPipe)
@Controller('/primary/:paymentSystem/:handlerDestination')
export class PrimaryController {
    constructor(private readonly primaryService: PrimaryService) {}

    /**
     * Entry point for GET method
     */
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async indexGet(
        @Query() query: Dictionary,
        @Param('paymentSystem') paymentSystem: PaymentSystem,
        @Param('handlerDestination') handlerDestination: HandlerDestination,
        @Response() reply: FastifyReply,
    ): Promise<void> {
        const processingResult = await this.primaryService.processRequest(
            query,
            paymentSystem,
            handlerDestination,
        );

        if (processingResult === IncomingRequestStatus.Processed) {
            const responseParams =
                this.primaryService.getResponseParamsByPaymentSystem(
                    paymentSystem,
                );

            reply.header('Content-Type', responseParams.contentType);
            reply.send(responseParams.payload);
        } else {
            throw new InternalServerErrorException('Incoming request failed');
        }
    }

    /**
     * Entry point for POST method
     */
    @Post('/')
    @HttpCode(HttpStatus.OK)
    async indexPost(
        @Body() body: Dictionary,
        @Param('paymentSystem') paymentSystem: PaymentSystem,
        @Param('destination') handlerDestination: HandlerDestination,
        @Response() reply: FastifyReply,
    ): Promise<void> {
        const processingResult = await this.primaryService.processRequest(
            body,
            paymentSystem,
            handlerDestination,
        );
        if (processingResult === IncomingRequestStatus.Processed) {
            const responseParams =
                this.primaryService.getResponseParamsByPaymentSystem(
                    paymentSystem,
                );

            reply.header('Content-Type', responseParams.contentType);
            reply.send(responseParams.payload);
        } else {
            throw new InternalServerErrorException('Incoming request failed');
        }
    }
}
