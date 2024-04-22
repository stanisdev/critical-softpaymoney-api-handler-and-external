import { Dictionary, MongoDocument } from 'src/common/types/general';
import { BalanceEntity } from 'src/database/entities/balance.entity';
import { balanceRepository } from 'src/database/repositories';
import {
    BalanceUpdateOperation,
    IncomingRequestStatus,
    Сurrency,
} from 'src/common/enums/general';
import { typeOrmDataSource } from 'src/database/data-source';
import { PaymentTransactionEntity } from 'src/database/entities/paymentTransaction.entity';
import { OrderEntity } from 'src/database/entities/order.entity';
import { IncomingRequestEntity } from 'src/database/entities/incomingRequest.entity';
import { BalanceUpdateQueueEntity } from 'src/database/entities/balanceUpdateQueue.entity';
import { GazpromRecurrentPayment } from './gazprom.recurrent-payment';

export class GazpromCompleteTransactionExecutor {
    private balanceInstance: BalanceEntity | null;
    private balanceRecord: Dictionary | undefined;

    constructor(
        private params: {
            orderInstance: MongoDocument;
            productInstance: MongoDocument;
            productOwner: MongoDocument;
            productOwnerBalance: MongoDocument;
            orderRecord: Dictionary;
            paymentTransactionRecord: Dictionary;
            incomingRequest: IncomingRequestEntity;
            isProductPaidRecurrently: boolean;
        },
    ) {}

    /**
     * Run the process
     */
    async execute(): Promise<void> {
        this.balanceInstance = await this.findBalanceInPostgres();

        if (!(this.balanceInstance instanceof BalanceEntity)) {
            const { productOwnerBalance } = this.params;

            this.balanceRecord = {
                mongoId: String(productOwnerBalance._id),
                value: Number(productOwnerBalance.balance),
                userId: String(productOwnerBalance.user),
                currencyType: productOwnerBalance.type,
                verificationHash: productOwnerBalance.balance_hash,
            };
            if ('card' in productOwnerBalance) {
                this.balanceRecord['cardId'] = String(productOwnerBalance.card);
            }
            if ('withdrawalAt' in productOwnerBalance) {
                this.balanceRecord['withdrawalAt'] =
                    productOwnerBalance.withdrawalAt;
            }
        }
        await this.runTransaction();
    }

    /**
     * Run transaction in Postgres
     */
    private async runTransaction(): Promise<void> {
        await typeOrmDataSource.manager.transaction(
            'SERIALIZABLE',
            async (transactionalEntityManager) => {
                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(PaymentTransactionEntity)
                    .values(this.params.paymentTransactionRecord)
                    .execute();
                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(OrderEntity)
                    .values(this.params.orderRecord)
                    .execute();
                await transactionalEntityManager
                    .createQueryBuilder()
                    .update(IncomingRequestEntity)
                    .set({
                        status: IncomingRequestStatus.Processed,
                    })
                    .where('id = :id', { id: this.params.incomingRequest.id })
                    .execute();

                let balanceId: number;

                /**
                 * Create user balance if not exist
                 */
                if (this.balanceRecord instanceof Object) {
                    const insertResult = await transactionalEntityManager
                        .createQueryBuilder()
                        .insert()
                        .into(BalanceEntity)
                        .values(this.balanceRecord)
                        .execute();

                    balanceId = Number(insertResult.raw[0].id);
                } else {
                    balanceId = this.balanceInstance.id;
                }
                /**
                 * Create record in 'RecurrentPaymentsQueue' table
                 */
                if (this.params.isProductPaidRecurrently) {
                    await new GazpromRecurrentPayment(
                        this.params.orderInstance,
                        this.params.productInstance,
                        this.params.incomingRequest.payload,
                        transactionalEntityManager,
                    ).setSchedule();
                }

                await transactionalEntityManager
                    .createQueryBuilder()
                    .insert()
                    .into(BalanceUpdateQueueEntity)
                    .values({
                        balanceId,
                        amount: Number(
                            this.params.paymentTransactionRecord.amount,
                        ),
                        operation: BalanceUpdateOperation.Increment,
                    })
                    .execute();
            },
        );
    }

    /**
     * Find user balance in Postgres
     */
    private findBalanceInPostgres(): Promise<BalanceEntity> {
        return balanceRepository
            .createQueryBuilder('b')
            .where('b."userId" = :userId', {
                userId: String(this.params.productOwner._id),
            })
            .andWhere('b."currencyType" = :currencyType', {
                currencyType: Сurrency.Rub,
            })
            .select(['b.id'])
            .limit(1)
            .getOne();
    }
}
