import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAlertEntity1759052251432 implements MigrationInterface {
    name = 'UpdateAlertEntity1759052251432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "resolver_id" uuid`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "note" text`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "image" text`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "device_id" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "resolvedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TYPE "public"."alerts_status_enum" RENAME TO "alerts_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'FALSE_ALARM', 'SYSTEM_ERROR')`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" TYPE "public"."alerts_status_enum" USING "status"::"text"::"public"."alerts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."alerts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_35cf41ead9c29b0d93671d4de22" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_35cf41ead9c29b0d93671d4de22"`);
        await queryRunner.query(`CREATE TYPE "public"."alerts_status_enum_old" AS ENUM('PENDING', 'RESOLVED')`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" TYPE "public"."alerts_status_enum_old" USING "status"::"text"::"public"."alerts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "alerts" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."alerts_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."alerts_status_enum_old" RENAME TO "alerts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "resolvedAt"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "device_id"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "note"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "resolver_id"`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
