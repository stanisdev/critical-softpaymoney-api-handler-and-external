import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Length, IsNumber } from 'class-validator';

@Entity('PaymentTransactions')
export class PaymentTransactionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Length(24)
    userId: string;

    @Column()
    @Length(24)
    productId: string;

    @Column()
    @Length(24)
    orderId: string;

    @Column()
    @IsNumber()
    amount: number;

    @Column()
    pan: string;

    @Column()
    type: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
