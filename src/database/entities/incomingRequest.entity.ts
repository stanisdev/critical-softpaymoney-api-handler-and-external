import { IsEnum } from 'class-validator';
import {
    HandlerDestination,
    IncomingRequestStatus,
    PaymentSystem,
} from '../../common/enums/general';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('IncomingRequests')
export class IncomingRequestEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('jsonb', { nullable: false })
    payload: string;

    @Column('jsonb', { nullable: true })
    metadata: string;

    @Column()
    @IsEnum(IncomingRequestStatus)
    status: IncomingRequestStatus;

    @Column()
    @IsEnum(PaymentSystem)
    paymentSystem: PaymentSystem;

    @Column()
    @IsEnum(HandlerDestination)
    handlerDestination: HandlerDestination;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
