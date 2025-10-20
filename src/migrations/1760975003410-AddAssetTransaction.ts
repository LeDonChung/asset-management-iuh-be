import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssetTransaction1760975003410 implements MigrationInterface {
    name = 'AddAssetTransaction1760975003410'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_old_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_new_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "asset_transaction_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "old_status" "public"."asset_transaction_histories_old_status_enum" NOT NULL, "new_status" "public"."asset_transaction_histories_new_status_enum" NOT NULL, "changed_by" uuid NOT NULL, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a65c0f9ec5d2509b727ee376b96" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_transaction_histories"."transaction_id" IS 'ID giao dịch tài sản'; COMMENT ON COLUMN "asset_transaction_histories"."old_status" IS 'Trạng thái giao dịch cũ'; COMMENT ON COLUMN "asset_transaction_histories"."new_status" IS 'Trạng thái giao dịch mới'; COMMENT ON COLUMN "asset_transaction_histories"."changed_by" IS 'Người thay đổi'; COMMENT ON COLUMN "asset_transaction_histories"."note" IS 'Ghi chú thay đổi'; COMMENT ON COLUMN "asset_transaction_histories"."created_at" IS 'Thời gian ghi nhận thay đổi'`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transactions_type_enum" AS ENUM('TRANSFER', 'INTERNAL_MOVE')`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transactions_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "asset_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."asset_transactions_type_enum" NOT NULL, "from_unit_id" uuid, "to_unit_id" uuid NOT NULL, "requester_id" uuid NOT NULL, "approver_id" uuid, "handover_id" uuid, "receiver_id" uuid, "status" "public"."asset_transactions_status_enum" NOT NULL DEFAULT 'DRAFT', "request_note" text, "approval_note" text, "rejection_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_b8fb08669f6493872b120ded3a7" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_transactions"."type" IS 'Loại giao dịch'; COMMENT ON COLUMN "asset_transactions"."from_unit_id" IS 'Đơn vị bàn giao (null nếu allocation)'; COMMENT ON COLUMN "asset_transactions"."to_unit_id" IS 'Đơn vị tiếp nhận'; COMMENT ON COLUMN "asset_transactions"."requester_id" IS 'Người yêu cầu'; COMMENT ON COLUMN "asset_transactions"."approver_id" IS 'Người phê duyệt (phòng quản trị)'; COMMENT ON COLUMN "asset_transactions"."handover_id" IS 'Người bàn giao'; COMMENT ON COLUMN "asset_transactions"."receiver_id" IS 'Người tiếp nhận'; COMMENT ON COLUMN "asset_transactions"."status" IS 'Trạng thái'; COMMENT ON COLUMN "asset_transactions"."request_note" IS 'Ghi chú yêu cầu'; COMMENT ON COLUMN "asset_transactions"."approval_note" IS 'Ghi chú phê duyệt'; COMMENT ON COLUMN "asset_transactions"."rejection_reason" IS 'Lý do từ chối'`);
        await queryRunner.query(`CREATE TABLE "asset_transaction_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "from_room_id" uuid, "to_room_id" uuid, "note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5ec28eb4c672958ab8eeb46687a" PRIMARY KEY ("id")); COMMENT ON COLUMN "asset_transaction_items"."from_room_id" IS 'Phòng hiện tại của tài sản này'; COMMENT ON COLUMN "asset_transaction_items"."to_room_id" IS 'Phòng đích cho tài sản này (có thể khác với transaction.toRoomId)'; COMMENT ON COLUMN "asset_transaction_items"."note" IS 'Ghi chú cho từng tài sản'`);
        await queryRunner.query(`ALTER TYPE "public"."assets_status_enum" RENAME TO "assets_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum" AS ENUM('IN_USE', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'LIQUIDATED')`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" TYPE "public"."assets_status_enum" USING "status"::"text"::"public"."assets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'IN_USE'`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ADD CONSTRAINT "FK_0a39e90b2dae8c90f6bf7820abc" FOREIGN KEY ("transaction_id") REFERENCES "asset_transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ADD CONSTRAINT "FK_463d27c38d21d719cc5a6979d0f" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_cbb97343a13228d3dc6d83a9c0a" FOREIGN KEY ("from_unit_id") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_5718f631973545794f19c395082" FOREIGN KEY ("to_unit_id") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_04ad2003442a70860ab9211bd22" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_db6e1abf49ce78690db2e7ef51f" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_a87722fff40da355f51a7fea8ff" FOREIGN KEY ("handover_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ADD CONSTRAINT "FK_b381b40d01c03c8b62c73a054c8" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" ADD CONSTRAINT "FK_6c3b3d0013931c1c7ffa22cde96" FOREIGN KEY ("transaction_id") REFERENCES "asset_transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" ADD CONSTRAINT "FK_f6ad4fefd33ff27ec4135db9406" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" ADD CONSTRAINT "FK_61ab234011ace0ea1a5b99cb7be" FOREIGN KEY ("from_room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" ADD CONSTRAINT "FK_a5135f3a319e7fec3e529902488" FOREIGN KEY ("to_room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" DROP CONSTRAINT "FK_a5135f3a319e7fec3e529902488"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" DROP CONSTRAINT "FK_61ab234011ace0ea1a5b99cb7be"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" DROP CONSTRAINT "FK_f6ad4fefd33ff27ec4135db9406"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" DROP CONSTRAINT "FK_6c3b3d0013931c1c7ffa22cde96"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_b381b40d01c03c8b62c73a054c8"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_a87722fff40da355f51a7fea8ff"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_db6e1abf49ce78690db2e7ef51f"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_04ad2003442a70860ab9211bd22"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_5718f631973545794f19c395082"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" DROP CONSTRAINT "FK_cbb97343a13228d3dc6d83a9c0a"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" DROP CONSTRAINT "FK_463d27c38d21d719cc5a6979d0f"`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" DROP CONSTRAINT "FK_0a39e90b2dae8c90f6bf7820abc"`);
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum_old" AS ENUM('IN_USE', 'WAITING_HANDOVER', 'WAITING_RECEIVE', 'DAMAGED', 'LOST', 'PROPOSED_LIQUIDATION', 'LIQUIDATED', 'WAITING_ALLOCATION')`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" TYPE "public"."assets_status_enum_old" USING "status"::"text"::"public"."assets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'WAITING_ALLOCATION'`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."assets_status_enum_old" RENAME TO "assets_status_enum"`);
        await queryRunner.query(`DROP TABLE "asset_transaction_items"`);
        await queryRunner.query(`DROP TABLE "asset_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "asset_transaction_histories"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_new_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_old_status_enum"`);
    }

}
