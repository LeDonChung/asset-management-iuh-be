import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuantityTransactionItem1765728736683 implements MigrationInterface {
    name = 'AddQuantityTransactionItem1765728736683'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" ADD "quantity" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`COMMENT ON COLUMN "asset_transaction_items"."quantity" IS 'Số lượng tài sản bàn giao'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "asset_transaction_items"."quantity" IS 'Số lượng tài sản bàn giao'`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_items" DROP COLUMN "quantity"`);
    }

}
