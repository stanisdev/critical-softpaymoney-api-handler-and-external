import { IsEnum } from 'class-validator';
import { DatabaseLogType } from '../../common/enums/general';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('Logs')
export class LogEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', {
        nullable: false,
    })
    @IsEnum(DatabaseLogType)
    type: DatabaseLogType;

    @Column('jsonb', {
        nullable: false,
    })
    payload: string;

    @CreateDateColumn()
    createdAt: Date;
}
