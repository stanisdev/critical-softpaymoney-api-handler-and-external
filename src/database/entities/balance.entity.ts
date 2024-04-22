import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Min, Length, IsNumber, IsEnum } from 'class-validator';
import { Сurrency } from '../../common/enums/general';

@Entity('Balances')
export class BalanceEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', {
        nullable: false,
    })
    @Length(24)
    mongoId: string;

    @Column('decimal', {
        nullable: false,
    })
    @IsNumber()
    @Min(0)
    value: number;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(Сurrency)
    currencyType: Сurrency;

    @Column('varchar', {
        nullable: false,
    })
    @Length(24)
    userId: string;

    @Column('varchar', {
        nullable: true,
    })
    @Length(24)
    cardId: string;

    @Column('varchar', {
        nullable: false,
    })
    verificationHash: string;

    @Column('timestamp', {
        nullable: true,
    })
    withdrawalAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
