import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ExternalInteractionService } from './external-interaction.service';
import { SuccessfulResponse } from 'src/common/types/general';
import { EntryPointDto } from './dto/entry-point.dto';

@Controller('/external-interaction')
export class ExternalInteractionController {
    constructor(
        private readonly externalInteractionService: ExternalInteractionService,
    ) {}

    @Post('/')
    @HttpCode(HttpStatus.OK)
    async entryPoint(@Body() dto: EntryPointDto): Promise<SuccessfulResponse> {
        await this.externalInteractionService.execute(dto);
        return {
            ok: true,
        };
    }
}
