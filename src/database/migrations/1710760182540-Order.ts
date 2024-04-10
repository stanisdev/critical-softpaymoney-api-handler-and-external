import { MigrationInterface, QueryRunner } from 'typeorm';

export class Order1710760182540 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE Orders_id_seq;

            CREATE TABLE "Orders" (
                id INTEGER DEFAULT nextval('Orders_id_seq') PRIMARY KEY,
                "mongoOrderId" CHARACTER(24) NOT NULL,
                "mongoProductId" CHARACTER(24) NOT NULL,
                "paymentId" VARCHAR(100),
                "paymentSystem" VARCHAR(60) NOT NULL, -- Payment system name
                "paymentAmount" DECIMAL NOT NULL,
                status VARCHAR(40) NOT NULL,
                "paidAt" TIMESTAMP,
                "createdAt" TIMESTAMP DEFAULT current_timestamp,
                "updatedAt" TIMESTAMP
            );
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS Orders;
            DROP SEQUENCE IF EXISTS Orders_id_seq;
        `);
    }
}
