import DatabaseLogger from '../../logger/database.logger';
import {
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ObjectId } from 'mongodb';
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

    async claimProductNotFound(productId: ObjectId): Promise<void> {
        await GazpromPreparationHelper.databaseLogger.write(
            DatabaseLogType.ProductNotFound,
            {
                productId,
            },
        );
        throw new InternalServerErrorException('Product not found');
    }

    async claimProductOwnerNotFound(productOwnerId: ObjectId): Promise<void> {
        await GazpromPreparationHelper.databaseLogger.write(
            DatabaseLogType.ProductOwnerNotFound,
            {
                productOwnerId,
            },
        );
        throw new InternalServerErrorException('Product owner not found');
    }

    async claimProductOwnerHasNoGazpromAccountId(
        productOwnerId: ObjectId,
    ): Promise<void> {
        await GazpromPreparationHelper.databaseLogger.write(
            DatabaseLogType.ProductOwnerHasNoGazpromAccountId,
            {
                productOwnerId,
            },
        );
        throw new InternalServerErrorException(
            'Product owner cannot be involved in the payment process',
        );
    }
}
