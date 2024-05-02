import { ObjectId } from 'mongodb';
import {
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { Dictionary, MongoDocument } from 'src/common/types/general';
import { typeOrmDataSource } from 'src/database/data-source';
import {
    DatabaseLogType,
    IncomingRequestStatus,
    OrderStatus,
} from 'src/common/enums/general';
import DatabaseLogger from '../../logger/database.logger';
import { PaymentTransactionEntity } from 'src/database/entities/paymentTransaction.entity';
import { OrderEntity } from 'src/database/entities/order.entity';
import { MathUtil } from 'src/common/utils/math.util';
import { MongoClient } from '../../mongoClient';

export class GazpromCompletionHelper {
    private static databaseLogger = DatabaseLogger.getInstance();
    private mongoClient = MongoClient.getInstance().database;

    constructor(private readonly incomingRequest: IncomingRequestEntity) {}

    /**
     * Get commission percent
     */
    getUserCommissionPercents(user: MongoDocument): number {
        if (
            user.percents instanceof Object &&
            typeof user.percents.GAZPROM === 'number'
        ) {
            return +user.percents.GAZPROM;
        }
        return 8;
    }

    /**
     * @notice
     * This method was taken from the Legacy API
     * without being changed (as is)
     */
    subtractCommissionFromAmount(
        sum: number,
        percent: number,
        isCommission: boolean,
        additionalCommission?: number,
    ): number {
        const amount = isCommission
            ? sum - (sum * percent) / (1 + percent)
            : sum - sum * percent;
        return MathUtil.ceil10(amount - (additionalCommission || 0), -2);
    }

    /**
     * Create order (original data is taken from Mongo)
     * and create transaction in Postgres
     */
    async completeRejectedOrderInPostgres(params: {
        orderRecord: Dictionary;
        paymentTransactionRecord: Dictionary;
        incomingRequestId: number;
    }): Promise<void> {
        await typeOrmDataSource.manager.transaction(
            'SERIALIZABLE',
            async (transactionalEntityManager) => {
                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(PaymentTransactionEntity)
                    .values(params.paymentTransactionRecord)
                    .execute();
                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(OrderEntity)
                    .values(params.orderRecord)
                    .execute();
                await transactionalEntityManager
                    .createQueryBuilder()
                    .update(IncomingRequestEntity)
                    .set({
                        status: IncomingRequestStatus.Processed,
                    })
                    .where('id = :id', { id: params.incomingRequestId })
                    .execute();
            },
        );
    }

    /**
     * Update order in Mongo as rejected
     */
    async rejectOrderInMongo(orderId: ObjectId): Promise<void> {
        await this.mongoClient.collection('orders').updateOne(
            {
                _id: orderId,
            },
            {
                $set: {
                    status: OrderStatus.Rejected,
                },
            },
        );
    }

    /**
     * Confirm order in Mongo
     */
    async confirmOrderInMongo(
        orderId: ObjectId,
        fieldsToUpdate: Dictionary,
    ): Promise<void> {
        await this.mongoClient.collection('orders').updateOne(
            {
                _id: orderId,
            },
            {
                $set: fieldsToUpdate,
            },
        );
    }

    /**
     * Insert payment transation in Mongo
     */
    async insertPaymentTransationInMongo(
        paymentTransactionRecord: Dictionary,
    ): Promise<void> {
        await this.mongoClient
            .collection('transactions')
            .insertOne(paymentTransactionRecord);
    }

    /**
     * Check correctness of order payment
     */
    async checkOrderPaymentCorrectness(
        order: MongoDocument,
        product: MongoDocument,
    ) {
        if (
            !(order.payment instanceof Object) ||
            Object.keys(order.payment).length < 2
        ) {
            await GazpromCompletionHelper.databaseLogger.write(
                DatabaseLogType.MongoOrderHasNoPaymentObject,
                {
                    incomingRequestId: this.incomingRequest.id,
                    'order.id': String(order._id),
                    'productOwner.id': product.user,
                },
            );
            throw new InternalServerErrorException(
                `Mongo order has no payment object (orderId: ${order._id})`,
            );
        }
    }

    /**
     * Parse payload amount and return the result
     */
    async parsePayloadAmount(
        payloadAmount: string,
        incomingRequestId: number,
    ): Promise<number> {
        const inputAmount = Number.parseFloat(payloadAmount);

        if (Number.isNaN(inputAmount)) {
            await GazpromCompletionHelper.databaseLogger.write(
                DatabaseLogType.IncomingRequestAmountIsIncorrect,
                {
                    incomingRequestId,
                },
            );
            throw new InternalServerErrorException(
                `Amount value ("${payloadAmount}") is not a number `,
            );
        }
        return inputAmount;
    }

    /**
     * Validate certificate content
     */
    async validateCertificateContent(
        certificateContent: string,
    ): Promise<void> {
        if (
            typeof certificateContent !== 'string' ||
            certificateContent.length < 1
        ) {
            await GazpromCompletionHelper.databaseLogger.write(
                DatabaseLogType.CertificateContentIsUnrecognizable,
                {
                    incomingRequestPayload: this.incomingRequest.payload,
                },
            );
            throw new BadRequestException('Wrong request data');
        }
    }
}
