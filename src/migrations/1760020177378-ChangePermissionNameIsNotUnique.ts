import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangePermissionNameIsNotUnique1760020177378 implements MigrationInterface {
    name = 'ChangePermissionNameIsNotUnique1760020177378'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permissions" DROP CONSTRAINT "UQ_48ce552495d14eae9b187bb6716"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permissions" ADD CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name")`);
    }

}
