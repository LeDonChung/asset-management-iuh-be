import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateInventoryResult1758394414012 implements MigrationInterface {
    name = 'UpdateInventoryResult1758394414012'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."createdAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "createdAt" SET DEFAULT now()`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."updatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "deletedAt" DROP NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."deletedAt" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."deletedAt" IS 'Ngày xóa'`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "deletedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "updatedAt" DROP DEFAULT`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."updatedAt" IS 'Ngày cập nhật'`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ALTER COLUMN "createdAt" DROP DEFAULT`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."createdAt" IS 'Ngày tạo'`);
    }

}
