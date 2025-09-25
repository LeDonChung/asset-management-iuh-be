import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventorySessionTable1757569905240 implements MigrationInterface {
    name = 'AddInventorySessionTable1757569905240'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "file_urls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_77f507b71bec77186ffe60cfa71" PRIMARY KEY ("id")); COMMENT ON COLUMN "file_urls"."url" IS 'URL của file'`);
        await queryRunner.query(`CREATE TYPE "public"."inventory_sessions_status_enum" AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "inventory_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "year" integer NOT NULL, "name" character varying NOT NULL, "period" integer NOT NULL, "is_global" boolean NOT NULL DEFAULT false, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."inventory_sessions_status_enum" NOT NULL DEFAULT 'PLANNED', "created_by" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_01d753744dfaff387aa43a3ff64" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_sessions"."year" IS 'Năm'; COMMENT ON COLUMN "inventory_sessions"."name" IS 'Tên kỳ kiểm kê, ví dụ: Kiểm kê cuối năm'; COMMENT ON COLUMN "inventory_sessions"."period" IS 'Đợt'; COMMENT ON COLUMN "inventory_sessions"."is_global" IS 'true: Một kỳ cho toàn bộ các đơn vị sử dụng, false: Một kì cho một đơn vị sử dụng'; COMMENT ON COLUMN "inventory_sessions"."start_date" IS 'Ngày bắt đầu'; COMMENT ON COLUMN "inventory_sessions"."end_date" IS 'Ngày kết thúc'; COMMENT ON COLUMN "inventory_sessions"."status" IS 'Trạng thái kỳ kiểm kê'; COMMENT ON COLUMN "inventory_sessions"."created_by" IS 'Người tạo'`);
        await queryRunner.query(`CREATE TABLE "inventory_session_units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_2442406cfa05bae838036395800" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_session_units"."session_id" IS 'ID của kỳ kiểm kê'; COMMENT ON COLUMN "inventory_session_units"."unit_id" IS 'ID của đơn vị'`);
        await queryRunner.query(`CREATE TABLE "file_urls_inventory_sessions" ("inventory_session_id" uuid NOT NULL, "file_url_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_28b5716036a20f24d0b1cc732ff" PRIMARY KEY ("inventory_session_id", "file_url_id"))`);
        await queryRunner.query(`ALTER TABLE "inventory_sessions" ADD CONSTRAINT "FK_502ed5d35cdbd15f4b20ae10a0e" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_session_units" ADD CONSTRAINT "FK_5e9f45dec467d9be358f42265bd" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_session_units" ADD CONSTRAINT "FK_d054011300b1ff199b06a1456b9" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file_urls_inventory_sessions" ADD CONSTRAINT "FK_412f7ec1946b3a3e709c9343f90" FOREIGN KEY ("inventory_session_id") REFERENCES "inventory_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file_urls_inventory_sessions" ADD CONSTRAINT "FK_d7329fe4838a9aee677a68871c8" FOREIGN KEY ("file_url_id") REFERENCES "file_urls"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_urls_inventory_sessions" DROP CONSTRAINT "FK_d7329fe4838a9aee677a68871c8"`);
        await queryRunner.query(`ALTER TABLE "file_urls_inventory_sessions" DROP CONSTRAINT "FK_412f7ec1946b3a3e709c9343f90"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_units" DROP CONSTRAINT "FK_d054011300b1ff199b06a1456b9"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_units" DROP CONSTRAINT "FK_5e9f45dec467d9be358f42265bd"`);
        await queryRunner.query(`ALTER TABLE "inventory_sessions" DROP CONSTRAINT "FK_502ed5d35cdbd15f4b20ae10a0e"`);
        await queryRunner.query(`DROP TABLE "file_urls_inventory_sessions"`);
        await queryRunner.query(`DROP TABLE "inventory_session_units"`);
        await queryRunner.query(`DROP TABLE "inventory_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_sessions_status_enum"`);
        await queryRunner.query(`DROP TABLE "file_urls"`);
    }

}
