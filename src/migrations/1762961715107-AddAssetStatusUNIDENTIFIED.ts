import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssetStatusUNIDENTIFIED1762961715107 implements MigrationInterface {
    name = 'AddAssetStatusUNIDENTIFIED1762961715107'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."asset_book_items_status_enum" RENAME TO "asset_book_items_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_book_items_status_enum" AS ENUM('IN_USE', 'TRANSFERRED', 'LIQUIDATED', 'MISSING', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'MOVED', 'UNIDENTIFIED')`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" TYPE "public"."asset_book_items_status_enum" USING "status"::"text"::"public"."asset_book_items_status_enum"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."asset_book_items_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."assets_status_enum" RENAME TO "assets_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum" AS ENUM('IN_USE', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'LIQUIDATED', 'UNIDENTIFIED')`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" TYPE "public"."assets_status_enum" USING "status"::"text"::"public"."assets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum_old" AS ENUM('IN_USE', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'LIQUIDATED')`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" TYPE "public"."assets_status_enum_old" USING "status"::"text"::"public"."assets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."assets_status_enum_old" RENAME TO "assets_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_book_items_status_enum_old" AS ENUM('IN_USE', 'TRANSFERRED', 'LIQUIDATED', 'MISSING', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'MOVED')`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" TYPE "public"."asset_book_items_status_enum_old" USING "status"::"text"::"public"."asset_book_items_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."asset_book_items_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_book_items_status_enum_old" RENAME TO "asset_book_items_status_enum"`);
    }

}
