import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeNullLookedAtAssetBook1758297952038 implements MigrationInterface {
    name = 'ChangeNullLookedAtAssetBook1758297952038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_books" ALTER COLUMN "lookedAt" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_books" ALTER COLUMN "lookedAt" SET NOT NULL`);
    }

}
