import { MigrationInterface, QueryRunner } from 'typeorm';

export class EncryptedStorage1714652886389 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE EncryptedStorage_id_seq;

            CREATE TABLE "EncryptedStorage" (
                id INTEGER DEFAULT nextval('EncryptedStorage_id_seq') PRIMARY KEY,
                destination VARCHAR(100) NOT NULL,
                metadata jsonb,
                content TEXT NOT NULL,
                comment VARCHAR(200),
                "createdAt" TIMESTAMP DEFAULT current_timestamp
            );
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS EncryptedStorage;
            DROP SEQUENCE IF EXISTS EncryptedStorage_id_seq;
        `);
    }
}
