import { IsEnum } from 'class-validator';
import { BalanceUpdateOperation } from '../../common/enums/general';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('BalanceUpdateQueue')
export class BalanceUpdateQueueEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('integer', {
        nullable: false,
    })
    balanceId: number;

    @Column('decimal', {
        nullable: false,
    })
    amount: number;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(BalanceUpdateOperation)
    operation: BalanceUpdateOperation;

    @Column('boolean', {
        nullable: true,
    })
    isWithdrawal: boolean;

    @Column('integer', {
        nullable: true,
    })
    paymentTransactionId: number;
}
