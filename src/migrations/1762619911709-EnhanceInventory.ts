import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceInventory1762619911709 implements MigrationInterface {
    name = 'EnhanceInventory1762619911709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_sessions" DROP COLUMN "period"`);
        await queryRunner.query(`ALTER TABLE "inventory_sessions" DROP COLUMN "isGlobal"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_sessions" ADD "isGlobal" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "inventory_sessions" ADD "period" integer NOT NULL`);
    }

}
