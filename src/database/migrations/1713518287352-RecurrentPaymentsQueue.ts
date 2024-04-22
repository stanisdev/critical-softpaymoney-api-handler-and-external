import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecurrentPaymentsQueue1713518287352 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE RecurrentPaymentsQueue_id_seq;

            CREATE TABLE "RecurrentPaymentsQueue" (
                id INTEGER DEFAULT nextval('RecurrentPaymentsQueue_id_seq') PRIMARY KEY,
                "dateToExecute" TIMESTAMP NOT NULL,
                "isFirstPeriod" BOOLEAN NOT NULL,
                "orderIdMongo" CHARACTER(24) NOT NULL,
                "paymentSystem" VARCHAR NOT NULL,
                metadata jsonb NOT NULL,
                "createdAt" TIMESTAMP DEFAULT current_timestamp
            );
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS RecurrentPaymentsQueue;
            DROP SEQUENCE IF EXISTS RecurrentPaymentsQueue_id_seq;
        `);
    }
}
