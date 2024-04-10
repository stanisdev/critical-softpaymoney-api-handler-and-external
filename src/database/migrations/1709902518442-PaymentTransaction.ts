import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentTransaction1709902518442 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE PaymentTransactions_id_seq;

            CREATE TABLE "PaymentTransactions" (
                id INTEGER DEFAULT nextval('PaymentTransactions_id_seq') PRIMARY KEY,
                "userId" CHARACTER(24) DEFAULT NULL,
                "productId" CHARACTER(24) NOT NULL,
                "orderId" CHARACTER(24) NOT NULL,
                amount DECIMAL NOT NULL,
                pan VARCHAR(29),
                type VARCHAR(50) NOT NULL,
                "createdAt" TIMESTAMP DEFAULT current_timestamp,
                "updatedAt" TIMESTAMP
            );
        `);
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS PaymentTransactions;
            DROP SEQUENCE IF EXISTS PaymentTransactions_id_seq;
        `);
    }
}
