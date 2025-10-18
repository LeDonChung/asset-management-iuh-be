import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsProtecedRole1760807843736 implements MigrationInterface {
    name = 'AddIsProtecedRole1760807843736'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "isProtected" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "isProtected"`);
    }

}
