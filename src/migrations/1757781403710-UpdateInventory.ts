import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateInventory1757781403710 implements MigrationInterface {
    name = 'UpdateInventory1757781403710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."inventory_session_members_role_enum" AS ENUM('LEADER', 'SECRETARY', 'MEMBER')`);
        await queryRunner.query(`CREATE TABLE "inventory_session_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "inventorySessionId" uuid NOT NULL, "role" "public"."inventory_session_members_role_enum" NOT NULL DEFAULT 'MEMBER', "notes" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_50f1defe0884d18b94955a0f8cf" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_session_members"."userId" IS 'ID của user tham gia'; COMMENT ON COLUMN "inventory_session_members"."inventorySessionId" IS 'ID của kỳ kiểm kê'; COMMENT ON COLUMN "inventory_session_members"."role" IS 'Vai trò trong kỳ kiểm kê'; COMMENT ON COLUMN "inventory_session_members"."notes" IS 'Ghi chú thêm'; COMMENT ON COLUMN "inventory_session_members"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f9fd8bc0f7758824a7f0b54e5b" ON "inventory_session_members" ("inventorySessionId", "userId") `);
        await queryRunner.query(`CREATE TABLE "inventory_group_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "unitId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "note" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_a827a35b660dfc5e6f2de4b9260" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_group_assignments"."groupId" IS 'ID của nhóm kiểm kê'; COMMENT ON COLUMN "inventory_group_assignments"."unitId" IS 'ID của đơn vị sử dụng (USER_DEPT)'; COMMENT ON COLUMN "inventory_group_assignments"."startDate" IS 'Ngày bắt đầu phân công'; COMMENT ON COLUMN "inventory_group_assignments"."endDate" IS 'Ngày kết thúc phân công'; COMMENT ON COLUMN "inventory_group_assignments"."note" IS 'Ghi chú'; COMMENT ON COLUMN "inventory_group_assignments"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`CREATE TYPE "public"."inventory_group_members_role_enum" AS ENUM('LEADER', 'SECRETARY', 'MEMBER')`);
        await queryRunner.query(`CREATE TABLE "inventory_group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "groupId" uuid NOT NULL, "role" "public"."inventory_group_members_role_enum" NOT NULL DEFAULT 'MEMBER', "notes" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_e7c6db5fc25994d2f485a5bcd6b" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_group_members"."userId" IS 'ID của user tham gia nhóm'; COMMENT ON COLUMN "inventory_group_members"."groupId" IS 'ID của nhóm kiểm kê'; COMMENT ON COLUMN "inventory_group_members"."role" IS 'Vai trò trong nhóm'; COMMENT ON COLUMN "inventory_group_members"."notes" IS 'Ghi chú thêm'; COMMENT ON COLUMN "inventory_group_members"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ec315fe0cc2b06942c8b0100ee" ON "inventory_group_members" ("groupId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."inventory_groups_status_enum" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "inventory_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "subInventoryId" uuid NOT NULL, "status" "public"."inventory_groups_status_enum" NOT NULL DEFAULT 'PLANNED', "description" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_3510aafe76a19b3a5d4d3524e3a" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_groups"."name" IS 'Tên nhóm kiểm kê'; COMMENT ON COLUMN "inventory_groups"."subInventoryId" IS 'ID của tiểu ban'; COMMENT ON COLUMN "inventory_groups"."status" IS 'Trạng thái nhóm'; COMMENT ON COLUMN "inventory_groups"."description" IS 'Mô tả nhóm'; COMMENT ON COLUMN "inventory_groups"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`CREATE TYPE "public"."sub_inventory_members_role_enum" AS ENUM('LEADER', 'SECRETARY', 'MEMBER')`);
        await queryRunner.query(`CREATE TABLE "sub_inventory_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "subInventoryId" uuid NOT NULL, "role" "public"."sub_inventory_members_role_enum" NOT NULL DEFAULT 'MEMBER', "notes" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_51f0e2d46aee025b767f4d8c0f9" PRIMARY KEY ("id")); COMMENT ON COLUMN "sub_inventory_members"."userId" IS 'ID của user tham gia tiểu ban'; COMMENT ON COLUMN "sub_inventory_members"."subInventoryId" IS 'ID của tiểu ban'; COMMENT ON COLUMN "sub_inventory_members"."role" IS 'Vai trò trong tiểu ban'; COMMENT ON COLUMN "sub_inventory_members"."notes" IS 'Ghi chú thêm'; COMMENT ON COLUMN "sub_inventory_members"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8945626ed51f48166d6ed88a9b" ON "sub_inventory_members" ("subInventoryId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."inventory_subs_status_enum" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "inventory_subs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "inventorySessionUnitId" uuid NOT NULL, "status" "public"."inventory_subs_status_enum" NOT NULL DEFAULT 'PLANNED', "description" character varying, "createdBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "REL_482a98a9e0a3c70ee323083917" UNIQUE ("inventorySessionUnitId"), CONSTRAINT "PK_6695262e1774c9f02f5e371dfa6" PRIMARY KEY ("id")); COMMENT ON COLUMN "inventory_subs"."name" IS 'Tên tiểu ban kiểm kê'; COMMENT ON COLUMN "inventory_subs"."inventorySessionUnitId" IS 'ID của cơ sở tham gia'; COMMENT ON COLUMN "inventory_subs"."status" IS 'Trạng thái tiểu ban'; COMMENT ON COLUMN "inventory_subs"."description" IS 'Mô tả tiểu ban'; COMMENT ON COLUMN "inventory_subs"."createdBy" IS 'Người tạo'`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" ADD CONSTRAINT "FK_684374ed59e464eb19eec6bcdc4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" ADD CONSTRAINT "FK_fe999ef485ff83f8995d3387974" FOREIGN KEY ("inventorySessionId") REFERENCES "inventory_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_group_assignments" ADD CONSTRAINT "FK_3a471560f25a63fcd25d6544a24" FOREIGN KEY ("groupId") REFERENCES "inventory_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_group_assignments" ADD CONSTRAINT "FK_52e85b10d13a296eaf6ff37658f" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_group_members" ADD CONSTRAINT "FK_356ed12c5edfe07bfcce0ae405c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_group_members" ADD CONSTRAINT "FK_33279df258b5ae6132530bfcb0a" FOREIGN KEY ("groupId") REFERENCES "inventory_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_groups" ADD CONSTRAINT "FK_81ca56b90359caab4dee8cb62a2" FOREIGN KEY ("subInventoryId") REFERENCES "inventory_subs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sub_inventory_members" ADD CONSTRAINT "FK_aa4dce8153e6d757e5331fc39c6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sub_inventory_members" ADD CONSTRAINT "FK_9b975fe48ee3f13dd28983ed5dd" FOREIGN KEY ("subInventoryId") REFERENCES "inventory_subs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_subs" ADD CONSTRAINT "FK_482a98a9e0a3c70ee3230839170" FOREIGN KEY ("inventorySessionUnitId") REFERENCES "inventory_session_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_subs" DROP CONSTRAINT "FK_482a98a9e0a3c70ee3230839170"`);
        await queryRunner.query(`ALTER TABLE "sub_inventory_members" DROP CONSTRAINT "FK_9b975fe48ee3f13dd28983ed5dd"`);
        await queryRunner.query(`ALTER TABLE "sub_inventory_members" DROP CONSTRAINT "FK_aa4dce8153e6d757e5331fc39c6"`);
        await queryRunner.query(`ALTER TABLE "inventory_groups" DROP CONSTRAINT "FK_81ca56b90359caab4dee8cb62a2"`);
        await queryRunner.query(`ALTER TABLE "inventory_group_members" DROP CONSTRAINT "FK_33279df258b5ae6132530bfcb0a"`);
        await queryRunner.query(`ALTER TABLE "inventory_group_members" DROP CONSTRAINT "FK_356ed12c5edfe07bfcce0ae405c"`);
        await queryRunner.query(`ALTER TABLE "inventory_group_assignments" DROP CONSTRAINT "FK_52e85b10d13a296eaf6ff37658f"`);
        await queryRunner.query(`ALTER TABLE "inventory_group_assignments" DROP CONSTRAINT "FK_3a471560f25a63fcd25d6544a24"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" DROP CONSTRAINT "FK_fe999ef485ff83f8995d3387974"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" DROP CONSTRAINT "FK_684374ed59e464eb19eec6bcdc4"`);
        await queryRunner.query(`DROP TABLE "inventory_subs"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_subs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8945626ed51f48166d6ed88a9b"`);
        await queryRunner.query(`DROP TABLE "sub_inventory_members"`);
        await queryRunner.query(`DROP TYPE "public"."sub_inventory_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "inventory_groups"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_groups_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec315fe0cc2b06942c8b0100ee"`);
        await queryRunner.query(`DROP TABLE "inventory_group_members"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_group_members_role_enum"`);
        await queryRunner.query(`DROP TABLE "inventory_group_assignments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9fd8bc0f7758824a7f0b54e5b"`);
        await queryRunner.query(`DROP TABLE "inventory_session_members"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_session_members_role_enum"`);
    }

}
