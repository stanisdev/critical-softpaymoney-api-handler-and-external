import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { InternalServerErrorException } from '@nestjs/common';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { Dictionary, MongoDocument } from 'src/common/types/general';
import { typeOrmDataSource } from 'src/database/data-source';
import {
    BalanceUpdateOperation,
    DatabaseLogType,
    IncomingRequestStatus,
    OrderStatus,
    Сurrency,
} from 'src/common/enums/general';
import { PaymentTransactionEntity } from 'src/database/entities/paymentTransaction.entity';
import { OrderEntity } from 'src/database/entities/order.entity';
import { MathUtil } from 'src/common/utils/math.util';
import { MongoClient } from '../../mongoClient';
import DatabaseLogger from '../../logger/database.logger';
import { balanceRepository } from 'src/database/repositories';
import { BalanceEntity } from 'src/database/entities/balance.entity';
import { BalanceUpdateQueueEntity } from 'src/database/entities/balanceUpdateQueue.entity';

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
     * Parse payload of incoming request to a plain object
     */
    parseIncomingRequest(): Dictionary {
        const { incomingRequest } = this;
        let payload: Dictionary;

        try {
            payload = JSON.parse(incomingRequest.payload);
        } catch {
            throw new InternalServerErrorException(
                `Payload of incoming request with id=${incomingRequest.id} cannot be parsed`,
            );
        }
        return payload;
    }

    isSignatureCorrect(
        signature: string,
        url: string,
        certificateContent: string,
    ): boolean {
        const decodedSignature = decodeURIComponent(signature);

        const publicKey = crypto
            .createPublicKey({ key: certificateContent })
            .export({ type: 'spki', format: 'pem' });

        return crypto
            .createVerify('RSA-SHA1')
            .update(url)
            .verify(publicKey, decodedSignature, 'base64');
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
     * Execute Postgres transaction to complete the given order
     */
    async completePaidOrderInPostgres(params: {
        productOwner: Dictionary;
        productOwnerBalance: Dictionary;
        orderRecord: Dictionary;
        paymentTransactionRecord: Dictionary;
        incomingRequestId: number;
    }): Promise<void> {
        const balanceInstance = await balanceRepository
            .createQueryBuilder('b')
            .where('b."userId" = :userId', {
                userId: String(params.productOwner._id),
            })
            .andWhere('b."currencyType" = :currencyType', {
                currencyType: Сurrency.Rub,
            })
            .select(['b.id'])
            .limit(1)
            .getOne();

        let balanceRecord: Dictionary | undefined;

        if (!(balanceInstance instanceof BalanceEntity)) {
            const { productOwnerBalance } = params;

            balanceRecord = {
                mongoId: String(productOwnerBalance._id),
                value: Number(productOwnerBalance.balance),
                userId: String(productOwnerBalance.user),
                currencyType: productOwnerBalance.type,
                verificationHash: productOwnerBalance.balance_hash,
            };
            if ('card' in productOwnerBalance) {
                balanceRecord['cardId'] = String(productOwnerBalance.card);
            }
            if ('withdrawalAt' in productOwnerBalance) {
                balanceRecord['withdrawalAt'] =
                    productOwnerBalance.withdrawalAt;
            }
        }

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

                let balanceId: number;

                /**
                 * Create user balance if not exist
                 */
                if (balanceRecord instanceof Object) {
                    const insertResult = await transactionalEntityManager
                        .createQueryBuilder()
                        .insert()
                        .into(BalanceEntity)
                        .values(balanceRecord)
                        .execute();

                    balanceId = Number(insertResult.raw[0].id);
                } else {
                    balanceId = balanceInstance.id;
                }
                const balanceUpdateQueueRecord = {
                    balanceId,
                    amount: Number(params.paymentTransactionRecord.amount),
                    operation: BalanceUpdateOperation.Increment,
                };
                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(BalanceUpdateQueueEntity)
                    .values(balanceUpdateQueueRecord)
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
                status: OrderStatus.Rejected,
            },
        );
    }

    /**
     * Confirm order in Mongo
     */
    async confirmOrderInMongo(
        orderId: ObjectId,
        orderRecord: Dictionary,
    ): Promise<void> {
        await this.mongoClient.collection('orders').updateOne(
            {
                _id: orderId,
            },
            orderRecord,
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
}
