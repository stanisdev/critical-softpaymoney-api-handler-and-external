import { Module } from '@nestjs/common';
import { ExternalInteractionController } from './external-interaction.controller';
import { ExternalInteractionService } from './external-interaction.service';
import { ExternalInteractionHelper } from './external-interaction.helper';

@Module({
    controllers: [ExternalInteractionController],
    providers: [ExternalInteractionService, ExternalInteractionHelper],
})
export class ExternalInteractionModule {}
