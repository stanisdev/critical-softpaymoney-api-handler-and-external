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
    /**
     * Это поле используется для получения данных об order,
     * который был создан ранее (как правило при самой первой оплате),
     * и на основе эти данных будет создан новый order, который будет использоваться
     * в качестве order для оплаты очередного авто-платежа.
     */
    orderIdMongo: string;

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
