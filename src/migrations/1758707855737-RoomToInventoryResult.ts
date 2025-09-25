import { MigrationInterface, QueryRunner } from "typeorm";

export class RoomToInventoryResult1758707855737 implements MigrationInterface {
    name = 'RoomToInventoryResult1758707855737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_results" ADD "roomId" uuid NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."roomId" IS 'ID của phòng'`);
        await queryRunner.query(`ALTER TABLE "inventory_results" ADD CONSTRAINT "FK_b212595d1abdd2ec9c215b44fa6" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_results" DROP CONSTRAINT "FK_b212595d1abdd2ec9c215b44fa6"`);
        await queryRunner.query(`COMMENT ON COLUMN "inventory_results"."roomId" IS 'ID của phòng'`);
        await queryRunner.query(`ALTER TABLE "inventory_results" DROP COLUMN "roomId"`);
    }

}
