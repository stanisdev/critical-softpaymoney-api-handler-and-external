import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncomingRequests1710139953829 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE IncomingRequests_id_seq;

            CREATE TYPE IncomingRequestStatus AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

            CREATE TABLE "IncomingRequests" (
                id INTEGER DEFAULT nextval('IncomingRequests_id_seq') PRIMARY KEY,
                payload jsonb NOT NULL,
                status IncomingRequestStatus NOT NULL,
                "paymentSystem" VARCHAR NOT NULL, -- Payment system name
                "handlerDestination" VARCHAR NOT NULL, -- Related to a endpoint of the handler controller
                "createdAt" TIMESTAMP DEFAULT current_timestamp,
                "updatedAt" TIMESTAMP
            );
        `);
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS IncomingRequests;
            DROP TYPE IF EXISTS IncomingRequestStatus;
            DROP SEQUENCE IF EXISTS IncomingRequests_id_seq;
        `);
    }
}
