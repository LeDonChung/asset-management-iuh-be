import { MigrationInterface, QueryRunner } from "typeorm";

export class LiquidationEntity1760633092962 implements MigrationInterface {
    name = 'LiquidationEntity1760633092962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "liquidation_proposal_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proposal_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "system_quantity" integer NOT NULL, "counted_quantity" integer NOT NULL, "note" text, "image_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_becfdbfd9740c7b27cb2966e1be" PRIMARY KEY ("id")); COMMENT ON COLUMN "liquidation_proposal_items"."proposal_id" IS 'Đề xuất thanh lý liên quan'; COMMENT ON COLUMN "liquidation_proposal_items"."asset_id" IS 'Tài sản / công cụ dụng cụ'; COMMENT ON COLUMN "liquidation_proposal_items"."system_quantity" IS 'Số lượng theo sổ sách'; COMMENT ON COLUMN "liquidation_proposal_items"."counted_quantity" IS 'Số lượng theo kiểm kê'; COMMENT ON COLUMN "liquidation_proposal_items"."note" IS 'Ghi chú thêm'; COMMENT ON COLUMN "liquidation_proposal_items"."image_url" IS 'Đường dẫn hình ảnh minh chứng (nếu có)'`);
        await queryRunner.query(`CREATE TYPE "public"."liquidation_proposals_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED', 'FINALIZED')`);
        await queryRunner.query(`CREATE TABLE "liquidation_proposals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proposer_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "status" "public"."liquidation_proposals_status_enum" NOT NULL DEFAULT 'PROPOSED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_b11f1df98f49bf1bec786b1f191" PRIMARY KEY ("id")); COMMENT ON COLUMN "liquidation_proposals"."proposer_id" IS 'Người đề xuất'; COMMENT ON COLUMN "liquidation_proposals"."unit_id" IS 'Đơn vị sử dụng'; COMMENT ON COLUMN "liquidation_proposals"."status" IS 'Trạng thái đề xuất'`);
        await queryRunner.query(`CREATE TYPE "public"."liquidation_histories_action_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED', 'FINALIZED')`);
        await queryRunner.query(`CREATE TABLE "liquidation_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proposal_id" uuid NOT NULL, "handler_id" uuid NOT NULL, "action_status" "public"."liquidation_histories_action_status_enum" NOT NULL, "evidence_url" character varying, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "PK_7dc4494931fe68f1d9a7f98298a" PRIMARY KEY ("id")); COMMENT ON COLUMN "liquidation_histories"."proposal_id" IS 'Đề xuất liên quan'; COMMENT ON COLUMN "liquidation_histories"."handler_id" IS 'Người xử lý'; COMMENT ON COLUMN "liquidation_histories"."action_status" IS 'Trạng thái sau khi xử lý'; COMMENT ON COLUMN "liquidation_histories"."evidence_url" IS 'Đường dẫn minh chứng (nếu có)'; COMMENT ON COLUMN "liquidation_histories"."note" IS 'Ghi chú'`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposal_items" ADD CONSTRAINT "FK_eec18162629a99135b490aafc42" FOREIGN KEY ("proposal_id") REFERENCES "liquidation_proposals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposal_items" ADD CONSTRAINT "FK_a30c6f7063fca39632a12e97b1c" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" ADD CONSTRAINT "FK_6024e40564a4896470870567890" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" ADD CONSTRAINT "FK_6828bc14ed556285f1ce2e924ba" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidation_histories" ADD CONSTRAINT "FK_31ac8440055caf0a76752ee85b7" FOREIGN KEY ("proposal_id") REFERENCES "liquidation_proposals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidation_histories" ADD CONSTRAINT "FK_0c74e28e3c67dfd080af78c625f" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidation_histories" DROP CONSTRAINT "FK_0c74e28e3c67dfd080af78c625f"`);
        await queryRunner.query(`ALTER TABLE "liquidation_histories" DROP CONSTRAINT "FK_31ac8440055caf0a76752ee85b7"`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" DROP CONSTRAINT "FK_6828bc14ed556285f1ce2e924ba"`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" DROP CONSTRAINT "FK_6024e40564a4896470870567890"`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposal_items" DROP CONSTRAINT "FK_a30c6f7063fca39632a12e97b1c"`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposal_items" DROP CONSTRAINT "FK_eec18162629a99135b490aafc42"`);
        await queryRunner.query(`DROP TABLE "liquidation_histories"`);
        await queryRunner.query(`DROP TYPE "public"."liquidation_histories_action_status_enum"`);
        await queryRunner.query(`DROP TABLE "liquidation_proposals"`);
        await queryRunner.query(`DROP TYPE "public"."liquidation_proposals_status_enum"`);
        await queryRunner.query(`DROP TABLE "liquidation_proposal_items"`);
    }

}
