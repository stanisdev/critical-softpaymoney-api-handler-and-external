import { IsEnum, Length } from 'class-validator';
import { PaymentSystem } from '../../common/enums/general';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('RecurrentPaymentsQueue')
export class RecurrentPaymentsQueueEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('timestamp', {
        nullable: false,
    })
    dateToExecute: Date;

    @Column('boolean', {
        nullable: false,
    })
    isFirstPeriod: boolean;

    @Column('character', {
        nullable: false,
    })
    @Length(24)
    productIdMongo: string;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(PaymentSystem)
    paymentSystem: PaymentSystem;

    @Column('jsonb', { nullable: false })
    metadata: string;

    @CreateDateColumn()
    createdAt: Date;
}
