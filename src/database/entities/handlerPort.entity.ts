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

    @Column('integer', {
        nullable: false,
    })
    value: number;

    @CreateDateColumn()
    createdAt: Date;
}
