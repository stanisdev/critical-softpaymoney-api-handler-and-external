import { IsEnum } from 'class-validator';
import { BalanceUpdateOperation } from 'src/common/enums/general';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('BalanceUpdateQueue')
export class BalanceUpdateQueueEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    balanceId: number;

    @Column()
    amount: number;

    @Column()
    @IsEnum(BalanceUpdateOperation)
    operation: BalanceUpdateOperation;

    @Column()
    isWithdrawal: boolean;

    @Column()
    paymentTransactionId: number;
}
