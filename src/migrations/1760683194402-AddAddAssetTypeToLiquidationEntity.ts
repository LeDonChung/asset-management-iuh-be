import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddAssetTypeToLiquidationEntity1760683194402 implements MigrationInterface {
    name = 'AddAddAssetTypeToLiquidationEntity1760683194402'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."liquidation_proposals_assettype_enum" AS ENUM('FIXED_ASSET', 'TOOLS_EQUIPMENT')`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" ADD "assetType" "public"."liquidation_proposals_assettype_enum" NOT NULL DEFAULT 'FIXED_ASSET'`);
        await queryRunner.query(`COMMENT ON COLUMN "liquidation_proposals"."assetType" IS 'Loại tài sản'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "liquidation_proposals"."assetType" IS 'Loại tài sản'`);
        await queryRunner.query(`ALTER TABLE "liquidation_proposals" DROP COLUMN "assetType"`);
        await queryRunner.query(`DROP TYPE "public"."liquidation_proposals_assettype_enum"`);
    }

}
