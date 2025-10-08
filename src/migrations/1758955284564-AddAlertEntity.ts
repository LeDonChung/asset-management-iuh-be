import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlertEntity1758955284564 implements MigrationInterface {
    name = 'AddAlertEntity1758955284564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_resolutions" RENAME COLUMN "resolved_at" TO "resolvedAt"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ALTER COLUMN "resolvedAt" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ALTER COLUMN "resolvedAt" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" RENAME COLUMN "resolvedAt" TO "resolved_at"`);
    }

}
