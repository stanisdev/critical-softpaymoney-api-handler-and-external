import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('HandlerPorts')
export class HandlerPortEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    value: number;

    @CreateDateColumn()
    createdAt: Date;
}
