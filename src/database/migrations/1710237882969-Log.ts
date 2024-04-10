import { MigrationInterface, QueryRunner } from 'typeorm';

export class Log1710237882969 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE Logs_id_seq;

            CREATE TABLE "Logs" (
                id INTEGER DEFAULT nextval('Logs_id_seq') PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                payload jsonb NOT NULL,
                "createdAt" TIMESTAMP DEFAULT current_timestamp
            );
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS Logs;
            DROP SEQUENCE IF EXISTS Logs_id_seq;
        `);
    }
}
