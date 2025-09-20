import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetBook1758191880038 implements MigrationInterface {
    name = 'AssetBook1758191880038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inventory_results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "systemQuantity" integer NOT NULL, "assetId" uuid NOT NULL, "assignmentId" uuid NOT NULL, "countedQuantity" integer NOT NULL, "scanMethod" character varying NOT NULL, "status" character varying NOT NULL, "note" character varying NOT NULL, "createdBy" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "deletedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_6308a3f95f0341213be0bfc5e40" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_results"."systemQuantity" IS 'Số lượng trên hệ thống'; COMMENT ON COLUMN "inventory_results"."assetId" IS 'ID của tài sản'; COMMENT ON COLUMN "inventory_results"."assignmentId" IS 'ID của phân công kiểm kê'; COMMENT ON COLUMN "inventory_results"."countedQuantity" IS 'Số lượng thực tế kiểm kê'; COMMENT ON COLUMN "inventory_results"."scanMethod" IS 'Phương pháp quét'; COMMENT ON COLUMN "inventory_results"."status" IS 'Trạng thái'; COMMENT ON COLUMN "inventory_results"."note" IS 'Ghi chú'; COMMENT ON COLUMN "inventory_results"."createdBy" IS 'Người tạo'; COMMENT ON COLUMN "inventory_results"."createdAt" IS 'Ngày tạo'; COMMENT ON COLUMN "inventory_results"."updatedAt" IS 'Ngày cập nhật'; COMMENT ON COLUMN "inventory_results"."deletedAt" IS 'Ngày xóa'`);
        await queryRunner.query(`CREATE TYPE "public"."asset_books_status_enum" AS ENUM('OPEN', 'LOCKED')`);
        await queryRunner.query(`CREATE TABLE "asset_books" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "unitId" uuid NOT NULL, "year" integer NOT NULL, "lookedAt" TIMESTAMP NOT NULL, "status" "public"."asset_books_status_enum" NOT NULL DEFAULT 'OPEN', CONSTRAINT "PK_473865c94cd8b21c1a21a7390a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."asset_book_items_status_enum" AS ENUM('IN_USE', 'TRANSFERRED', 'LIQUIDATED', 'MISSING')`);
        await queryRunner.query(`CREATE TABLE "asset_book_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bookId" uuid NOT NULL, "roomId" uuid NOT NULL, "assetId" uuid NOT NULL, "assignedAt" TIMESTAMP NOT NULL, "quantity" integer NOT NULL, "status" "public"."asset_book_items_status_enum" NOT NULL DEFAULT 'IN_USE', "note" character varying NOT NULL, CONSTRAINT "PK_6a57aea0cbdebea12a27f5fb4d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ADD CONSTRAINT "FK_67ef8f119610855190c7f9105b5" FOREIGN KEY ("assignmentId") REFERENCES "inventory_group_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ADD CONSTRAINT "FK_90aee882ed2fbd7d10a840e44ac" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_books" ADD CONSTRAINT "FK_e149a4d838e13e25526963cde92" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ADD CONSTRAINT "FK_d37fcb88e5b266fb6365bd765da" FOREIGN KEY ("bookId") REFERENCES "asset_books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ADD CONSTRAINT "FK_f7605c373ed2768a8a6925788e9" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" ADD CONSTRAINT "FK_0e0c8cb53233afe15bfefcfc94d" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_book_items" DROP CONSTRAINT "FK_0e0c8cb53233afe15bfefcfc94d"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" DROP CONSTRAINT "FK_f7605c373ed2768a8a6925788e9"`);
        await queryRunner.query(`ALTER TABLE "asset_book_items" DROP CONSTRAINT "FK_d37fcb88e5b266fb6365bd765da"`);
        await queryRunner.query(`ALTER TABLE "asset_books" DROP CONSTRAINT "FK_e149a4d838e13e25526963cde92"`);
        await queryRunner.query(`ALTER TABLE "inventory_results" DROP CONSTRAINT "FK_90aee882ed2fbd7d10a840e44ac"`);
        await queryRunner.query(`ALTER TABLE "inventory_results" DROP CONSTRAINT "FK_67ef8f119610855190c7f9105b5"`);
        await queryRunner.query(`DROP TABLE "asset_book_items"`);
        await queryRunner.query(`DROP TYPE "public"."asset_book_items_status_enum"`);
        await queryRunner.query(`DROP TABLE "asset_books"`);
        await queryRunner.query(`DROP TYPE "public"."asset_books_status_enum"`);
        await queryRunner.query(`DROP TABLE "inventory_results"`);
    }

}
