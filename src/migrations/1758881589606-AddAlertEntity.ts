import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlertEntity1758881589606 implements MigrationInterface {
    name = 'AddAlertEntity1758881589606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "detected_at"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" DROP CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ADD CONSTRAINT "UQ_3f6f61f1123b7dea89f5958c496" UNIQUE ("alert_id")`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ADD CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_resolutions" DROP CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" DROP CONSTRAINT "UQ_3f6f61f1123b7dea89f5958c496"`);
        await queryRunner.query(`ALTER TABLE "alert_resolutions" ADD CONSTRAINT "FK_3f6f61f1123b7dea89f5958c496" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD "detected_at" TIMESTAMP NOT NULL`);
    }

}
