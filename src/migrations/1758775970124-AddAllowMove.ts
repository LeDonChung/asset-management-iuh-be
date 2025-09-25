import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllowMove1758775970124 implements MigrationInterface {
    name = 'AddAllowMove1758775970124'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" ADD "allow_move" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`COMMENT ON COLUMN "assets"."allow_move" IS 'Cho phép di chuyển'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "assets"."allow_move" IS 'Cho phép di chuyển'`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "allow_move"`);
    }

}
