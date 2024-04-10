import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { HandlerService } from './handler.service';
import { SuccessfulResponse } from 'src/common/types/general';
import { ProcessDto } from './dto/process.dto';

@Controller('/handler')
export class HandlerController {
    constructor(private readonly handlerService: HandlerService) {}

    @Post('/')
    @HttpCode(HttpStatus.OK)
    async processIncomingRequest(
        @Body() body: ProcessDto,
    ): Promise<SuccessfulResponse> {
        await this.handlerService.process(body.incomingRequestId);
        return {
            ok: true,
        };
    }
}
