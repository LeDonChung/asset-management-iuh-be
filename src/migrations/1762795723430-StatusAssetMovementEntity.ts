import { MigrationInterface, QueryRunner } from "typeorm";

export class StatusAssetMovementEntity1762795723430 implements MigrationInterface {
    name = 'StatusAssetMovementEntity1762795723430'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."asset_book_items_status_enum" RENAME TO "asset_book_items_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_book_items_status_enum" AS ENUM('IN_USE', 'TRANSFERRED', 'LIQUIDATED', 'MISSING', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'MOVED')`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" TYPE "public"."asset_book_items_status_enum" USING "status"::"text"::"public"."asset_book_items_status_enum"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."asset_book_items_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" ALTER COLUMN "old_status" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" ALTER COLUMN "old_status" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."asset_book_items_status_enum_old" AS ENUM('IN_USE', 'TRANSFERRED', 'LIQUIDATED', 'MISSING')`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" TYPE "public"."asset_book_items_status_enum_old" USING "status"::"text"::"public"."asset_book_items_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."asset_book_items_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_book_items_status_enum_old" RENAME TO "asset_book_items_status_enum"`);
    }

}
