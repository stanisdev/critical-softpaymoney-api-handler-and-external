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

    @Column('character', {
        nullable: false,
    })
    @Length(24)
    userId: string;

    @Column('character', {
        nullable: false,
    })
    @Length(24)
    productId: string;

    @Column('character', {
        nullable: false,
    })
    @Length(24)
    orderId: string;

    @Column('decimal', {
        nullable: false,
    })
    @IsNumber()
    amount: number;

    @Column('varchar', {
        nullable: true,
    })
    pan: string;

    @Column('varchar', {
        nullable: false,
    })
    type: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
