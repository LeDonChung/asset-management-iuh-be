import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlertEntity1758815801027 implements MigrationInterface {
    name = 'AddAlertEntity1758815801027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."alert_resolutions_resolution_enum" AS ENUM('CONFIRMED', 'FALSE_ALARM', 'SYSTEM_ERROR')`);
        await queryRunner.query(`CREATE TABLE "alert_resolutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "alert_id" uuid NOT NULL, "resolver_id" uuid NOT NULL, "resolution" "public"."alert_resolutions_resolution_enum" NOT NULL, "note" text, "resolved_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_ef413c32bcf3fd83f38687116b5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_type_enum" AS ENUM('UNAUTHORIZED_MOVEMENT')`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_status_enum" AS ENUM('PENDING', 'RESOLVED')`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "detected_at" TIMESTAMP NOT NULL, "room_id" uuid NOT NULL, "type" "public"."alerts_type_enum" NOT NULL DEFAULT 'UNAUTHORIZED_MOVEMENT', "status" "public"."alerts_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ADD CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ADD CONSTRAINT "FK_6863b3368562d34f87e282b8323" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_57d37ec8d57aace3d1c8173a928" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_6db8373fed57e269836a5dd80db" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_6db8373fed57e269836a5dd80db"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_57d37ec8d57aace3d1c8173a928"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" DROP CONSTRAINT "FK_6863b3368562d34f87e282b8323"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" DROP CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TYPE "public"."alerts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alerts_type_enum"`);
        await queryRunner.query(`DROP TABLE "alert_resolutions"`);
        await queryRunner.query(`DROP TYPE "public"."alert_resolutions_resolution_enum"`);
    }

}
