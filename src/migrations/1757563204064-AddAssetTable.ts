import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssetTable1757563204064 implements MigrationInterface {
    name = 'AddAssetTable1757563204064'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "rfid_tags" ("rfid_id" character varying NOT NULL, "asset_id" uuid NOT NULL, "assigned_date" character varying NOT NULL, CONSTRAINT "UQ_0b1e80998ec0139ef3a957330ea" UNIQUE ("asset_id"), CONSTRAINT "REL_0b1e80998ec0139ef3a957330e" UNIQUE ("asset_id"), CONSTRAINT "PK_881e91ff60457845d79dc736e74" PRIMARY KEY ("rfid_id")); COMMENT ON COLUMN "rfid_tags"."rfid_id" IS 'E280F3362000F00005E66021'; COMMENT ON COLUMN "rfid_tags"."asset_id" IS 'Mã tài sản cố định'; COMMENT ON COLUMN "rfid_tags"."assigned_date" IS 'Ngày định danh và đưa vào tài sản'`);
        await queryRunner.query(`CREATE TYPE "public"."assets_type_enum" AS ENUM('FIXED_ASSET', 'TOOLS_EQUIPMENT')`);
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum" AS ENUM('IN_USE', 'WAITING_HANDOVER', 'WAITING_RECEIVE', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'LIQUIDATED', 'WAITING_ALLOCATION')`);
        await queryRunner.query(`CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kt_code" character varying NOT NULL, "fixed_code" character varying NOT NULL, "name" character varying NOT NULL, "specs" character varying, "entrydate" date NOT NULL, "current_room_id" uuid, "unit" character varying NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "origin" character varying, "purchase_package" integer NOT NULL DEFAULT '0', "type" "public"."assets_type_enum" NOT NULL, "category_id" uuid NOT NULL, "status" "public"."assets_status_enum" NOT NULL DEFAULT 'WAITING_ALLOCATION', "created_by" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id")); COMMENT ON COLUMN "assets"."kt_code" IS 'Mã kế toán: xx-yyyy/nn (e.g., 19-0205/00)'; COMMENT ON COLUMN "assets"."fixed_code" IS 'Mã tài sản cố định xxxx.yyyy'; COMMENT ON COLUMN "assets"."name" IS 'Tên tài sản'; COMMENT ON COLUMN "assets"."specs" IS 'Thông số kĩ thuật'; COMMENT ON COLUMN "assets"."entrydate" IS 'Ngày nhập'; COMMENT ON COLUMN "assets"."current_room_id" IS 'Mã vị trí hiện tại'; COMMENT ON COLUMN "assets"."unit" IS 'Đơn vị tính'; COMMENT ON COLUMN "assets"."quantity" IS 'Số lượng: Với tài sản cố định = 1'; COMMENT ON COLUMN "assets"."origin" IS 'Xuất xứ'; COMMENT ON COLUMN "assets"."purchase_package" IS 'Gói mua'; COMMENT ON COLUMN "assets"."type" IS 'Loại tài sản'; COMMENT ON COLUMN "assets"."category_id" IS 'Danh mục - 4: máy tính, 3: thiết bị văn phòng, 5: máy in'; COMMENT ON COLUMN "assets"."status" IS 'Trạng thái tài sản'; COMMENT ON COLUMN "assets"."created_by" IS 'User who initiated the handover'`);
        await queryRunner.query(`CREATE INDEX "IDX_56647aa3c21954f7c7fcbc2505" ON "assets" ("type") `);
        await queryRunner.query(`ALTER TABLE "rfid_tags" ADD CONSTRAINT "FK_0b1e80998ec0139ef3a957330ea" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_bfdc3fe63eb7269f4a286252641" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_dccd1dbe2c036b9ab80876466b7" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_d19eaa136bc582c729636946879" FOREIGN KEY ("current_room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_d19eaa136bc582c729636946879"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_dccd1dbe2c036b9ab80876466b7"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_bfdc3fe63eb7269f4a286252641"`);
        await queryRunner.query(`ALTER TABLE "rfid_tags" DROP CONSTRAINT "FK_0b1e80998ec0139ef3a957330ea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56647aa3c21954f7c7fcbc2505"`);
        await queryRunner.query(`DROP TABLE "assets"`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."assets_type_enum"`);
        await queryRunner.query(`DROP TABLE "rfid_tags"`);
    }

}
