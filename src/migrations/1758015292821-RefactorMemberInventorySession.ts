import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorMemberInventorySession1758015292821 implements MigrationInterface {
    name = 'RefactorMemberInventorySession1758015292821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_session_members" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_session_members_role_enum"`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" ADD "role" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_session_members"."role" IS 'Chức vụ'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "inventory_session_members"."role" IS 'Chức vụ'`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "public"."inventory_session_members_role_enum" AS ENUM('LEADER', 'SECRETARY', 'MEMBER')`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" ADD "role" "public"."inventory_session_members_role_enum" NOT NULL DEFAULT 'MEMBER'`);
        await queryRunner.query(`ALTER TABLE "inventory_session_members" ADD "notes" character varying`);
    }

}
