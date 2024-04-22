import { IsEnum } from 'class-validator';
import { OrderStatus, PaymentSystem } from '../../common/enums/general';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('Orders')
export class OrderEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('character', {
        nullable: false,
    })
    mongoOrderId: string;

    @Column('character', {
        nullable: false,
    })
    mongoProductId: string;

    @Column('varchar', {
        nullable: true,
    })
    paymentId: string;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(PaymentSystem)
    paymentSystem: PaymentSystem;

    @Column('decimal', {
        nullable: false,
    })
    paymentAmount: number;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @Column('timestamp', {
        nullable: true,
    })
    paidAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
