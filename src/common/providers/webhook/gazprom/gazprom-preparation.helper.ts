import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import DatabaseLogger from '../../logger/database.logger';
import { DatabaseLogType } from 'src/common/enums/general';

export class GazpromPreparationHelper {
    private static databaseLogger = DatabaseLogger.getInstance();

    async claimIncorrectOrderStatus(orderId: ObjectId): Promise<void> {
        await GazpromPreparationHelper.databaseLogger.write(
            DatabaseLogType.OrderStatusShouldBeEuqalCreated,
            {
                orderId,
            },
        );
        throw new BadRequestException('Order status should be equal "Created"');
    }
}
