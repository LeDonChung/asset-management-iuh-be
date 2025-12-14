import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoveTransactionItem1765732260009 implements MigrationInterface {
    name = 'AddMoveTransactionItem1765732260009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset_movement_items" ADD "quantity" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`COMMENT ON COLUMN "asset_movement_items"."quantity" IS 'Số lượng tài sản di chuyển'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "asset_movement_items"."quantity" IS 'Số lượng tài sản di chuyển'`);
        await queryRunner.query(`ALTER TABLE "asset_movement_items" DROP COLUMN "quantity"`);
    }

}
