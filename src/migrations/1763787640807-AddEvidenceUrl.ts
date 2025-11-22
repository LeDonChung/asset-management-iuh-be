import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEvidenceUrl1763787640807 implements MigrationInterface {
    name = 'AddEvidenceUrl1763787640807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ADD "evidence_url" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "asset_transaction_histories"."evidence_url" IS 'Đường dẫn minh chứng (nếu có)'`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" ADD "evidence_url" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "asset_movement_histories"."evidence_url" IS 'Đường dẫn minh chứng (nếu có)'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "asset_movement_histories"."evidence_url" IS 'Đường dẫn minh chứng (nếu có)'`);
        await queryRunner.query(`ALTER TABLE "asset_movement_histories" DROP COLUMN "evidence_url"`);
        await queryRunner.query(`COMMENT ON COLUMN "asset_transaction_histories"."evidence_url" IS 'Đường dẫn minh chứng (nếu có)'`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" DROP COLUMN "evidence_url"`);
    }

}
