import { MigrationInterface, QueryRunner } from 'typeorm';

export class HandlerPort1711519782939 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE SEQUENCE HandlerPorts_id_seq;

            CREATE TABLE "HandlerPorts" (
                id INTEGER DEFAULT nextval('HandlerPorts_id_seq') PRIMARY KEY,
                value INTEGER NOT NULL,
                "createdAt" TIMESTAMP DEFAULT current_timestamp,
                UNIQUE (value)
            );
        `);
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS HandlerPorts;
            DROP SEQUENCE IF EXISTS HandlerPorts_id_seq;
        `);
    }
}
