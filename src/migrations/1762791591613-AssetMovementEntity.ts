import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetMovementEntity1762791591613 implements MigrationInterface {
    name = 'AssetMovementEntity1762791591613'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."asset_movement_histories_old_status_enum" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."asset_movement_histories_new_status_enum" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "asset_movement_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "movement_id" uuid NOT NULL, "old_status" "public"."asset_movement_histories_old_status_enum" NOT NULL, "new_status" "public"."asset_movement_histories_new_status_enum" NOT NULL, "changed_by" uuid NOT NULL, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0042e64e75a5fb86a7a0d731aee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."asset_movements_status_enum" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "asset_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requester_id" uuid NOT NULL, "approver_id" uuid, "status" "public"."asset_movements_status_enum" NOT NULL DEFAULT 'PENDING_APPROVAL', "requestNote" text, "approvalNote" text, "rejectionReason" text, "approved_at" TIMESTAMP, "completed_at" TIMESTAMP, "cancelled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_f99f755a0dd716f1bad3ff2b313" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_movements"."requestNote" IS 'Ghi chú của người yêu cầu'; COMMENT ON COLUMN "asset_movements"."approvalNote" IS 'Ghi chú phê duyệt'; COMMENT ON COLUMN "asset_movements"."rejectionReason" IS 'Lý do từ chối'; COMMENT ON COLUMN "asset_movements"."approved_at" IS 'Thời gian phê duyệt'; COMMENT ON COLUMN "asset_movements"."completed_at" IS 'Thời gian hoàn thành di chuyển'; COMMENT ON COLUMN "asset_movements"."cancelled_at" IS 'Thời gian hủy bỏ'`);
        await queryRunner.query(`CREATE TABLE "asset_movement_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "movement_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "from_room_id" uuid NOT NULL, "to_room_id" uuid NOT NULL, "note" text, "moved_at" TIMESTAMP, "moved_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e79ef316e2224cbd6400b465cb8" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_movement_items"."moved_at" IS 'Thời gian thực hiện di chuyển'; COMMENT ON COLUMN "asset_movement_items"."moved_by" IS 'Người thực hiện di chuyển'`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" ADD CONSTRAINT "FK_c70cddd550c3ea84b3ca9301761" FOREIGN KEY ("movement_id") REFERENCES "asset_movements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" ADD CONSTRAINT "FK_c2f2f2311eda5acb51f3b503f20" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movements" ADD CONSTRAINT "FK_2d983303f45609f5cf50f62cb4f" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movements" ADD CONSTRAINT "FK_afcdfa7fa105b0bcf5165087117" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD CONSTRAINT "FK_2ffaeff88295b86ee08fe5033e0" FOREIGN KEY ("movement_id") REFERENCES "asset_movements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD CONSTRAINT "FK_51442f4db248ecaa4835579dae6" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD CONSTRAINT "FK_0080a9529f0b0a43d92cbda32be" FOREIGN KEY ("from_room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD CONSTRAINT "FK_86cca7d23c7271ea99c04ff24fe" FOREIGN KEY ("to_room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD CONSTRAINT "FK_73753945f01e01590edbc15aad9" FOREIGN KEY ("moved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP CONSTRAINT "FK_73753945f01e01590edbc15aad9"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP CONSTRAINT "FK_86cca7d23c7271ea99c04ff24fe"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP CONSTRAINT "FK_0080a9529f0b0a43d92cbda32be"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP CONSTRAINT "FK_51442f4db248ecaa4835579dae6"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP CONSTRAINT "FK_2ffaeff88295b86ee08fe5033e0"`);
        await queryRunner.query(`ALTER TABLE "asset_movements" DROP CONSTRAINT "FK_afcdfa7fa105b0bcf5165087117"`);
        await queryRunner.query(`ALTER TABLE "asset_movements" DROP CONSTRAINT "FK_2d983303f45609f5cf50f62cb4f"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" DROP CONSTRAINT "FK_c2f2f2311eda5acb51f3b503f20"`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" DROP CONSTRAINT "FK_c70cddd550c3ea84b3ca9301761"`);
        await queryRunner.query(`DROP TABLE "asset_movement_items"`);
        await queryRunner.query(`DROP TABLE "asset_movements"`);
        await queryRunner.query(`DROP TYPE "public"."asset_movements_status_enum"`);
        await queryRunner.query(`DROP TABLE "asset_movement_histories"`);
        await queryRunner.query(`DROP TYPE "public"."asset_movement_histories_new_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."asset_movement_histories_old_status_enum"`);
    }

}
