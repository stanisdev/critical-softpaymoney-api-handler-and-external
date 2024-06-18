import { Injectable } from '@nestjs/common';
import { EntryPointDto } from './dto/entry-point.dto';
import { ExternalInteractionHelper } from './external-interaction.helper';
import { ExternalInteractionDataSource } from './external-interaction.data-source';
import { AtolExecutor } from 'src/common/providers/atol/atol.executor';
import { GetCourseExecutor } from 'src/common/providers/getCourse/get-course.executor';
import { MerchantWebhookInteraction } from 'src/common/providers/external-interactions/merchant-webhook.interaction';

@Injectable()
export class ExternalInteractionService {
    constructor(private helper: ExternalInteractionHelper) {}

    /**
     * Start class execution
     */
    async execute({
        payload: compressedPayload,
    }: EntryPointDto): Promise<void> {
        const payload = this.helper.parseCompressedPayload(compressedPayload);

        const dataSource = new ExternalInteractionDataSource(payload);
        await dataSource.load();

        const merchantWebhook = new MerchantWebhookInteraction(
            payload,
            dataSource,
        );
        await merchantWebhook.execute();

        const atolExecutor = new AtolExecutor(dataSource);
        atolExecutor.run();

        const getCourseExecutor = new GetCourseExecutor(dataSource);
        getCourseExecutor.run();
    }
}
