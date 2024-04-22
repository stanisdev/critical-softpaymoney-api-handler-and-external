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

    @Column()
    dateToExecute: Date;

    @Column()
    isFirstPeriod: boolean;

    @Column()
    @Length(24)
    productIdMongo: string;

    @Column()
    @IsEnum(PaymentSystem)
    paymentSystem: PaymentSystem;

    @Column('jsonb', { nullable: false })
    metadata: string;

    @CreateDateColumn()
    createdAt: Date;
}
