import { IsEnum } from 'class-validator';
import { DatabaseLogType } from 'src/common/enums/general';
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

    @Column()
    @IsEnum(DatabaseLogType)
    type: DatabaseLogType;

    @Column()
    payload: string;

    @CreateDateColumn()
    createdAt: Date;
}
