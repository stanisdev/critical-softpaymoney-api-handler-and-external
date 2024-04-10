import { MigrationInterface, QueryRunner } from 'typeorm';

export class BalanceUpdateQueue1710923771583 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE BalanceUpdateQueue_id_seq;

            CREATE TYPE BalanceUpdateOperation AS ENUM ('INCREMENT', 'DECREMENT');

            CREATE TABLE "BalanceUpdateQueue" (
                id INTEGER DEFAULT nextval('BalanceUpdateQueue_id_seq') PRIMARY KEY,
                "balanceId" INTEGER NOT NULL,
                amount DECIMAL NOT NULL,
                operation BalanceUpdateOperation NOT NULL,
                "isWithdrawal" BOOLEAN DEFAULT false,
                "paymentTransactionId" INTEGER
            );
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS BalanceUpdateQueue;
            DROP TYPE IF EXISTS BalanceUpdateOperation;
            DROP SEQUENCE IF EXISTS BalanceUpdateQueue_id_seq;
        `);
    }
}
