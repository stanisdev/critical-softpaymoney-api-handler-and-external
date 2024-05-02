import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('EncryptedStorage')
export class EncryptedStorageEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', {
        nullable: false,
    })
    destination: string;

    @Column('jsonb', { nullable: true })
    metadata: string;

    @Column('text', {
        nullable: false,
    })
    content: string;

    @Column('varchar', {
        nullable: true,
    })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}
