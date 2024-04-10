import { IsEnum } from 'class-validator';
import { OrderStatus, PaymentSystem } from 'src/common/enums/general';
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

    @Column()
    mongoOrderId: string;

    @Column()
    mongoProductId: string;

    @Column()
    paymentId: string;

    @Column()
    @IsEnum(PaymentSystem)
    paymentSystem: PaymentSystem;

    @Column()
    paymentAmount: number;

    @Column()
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @Column()
    paidAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
