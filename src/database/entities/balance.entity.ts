import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Min, Length, IsNumber, IsEnum } from 'class-validator';
import { Сurrency } from 'src/common/enums/general';

@Entity('Balances')
export class BalanceEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Length(24)
    mongoId: string;

    @Column()
    @IsNumber()
    @Min(0)
    value: number;

    @Column()
    @IsEnum(Сurrency)
    currencyType: Сurrency;

    @Column()
    @Length(24)
    userId: string;

    @Column()
    @Length(24)
    cardId: string;

    @Column()
    verificationHash: string;

    @Column()
    withdrawalAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
