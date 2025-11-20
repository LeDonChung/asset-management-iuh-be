import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocaltionInRoom1762963893538 implements MigrationInterface {
    name = 'AddLocaltionInRoom1762963893538'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" ADD "location_in_room" character varying`);
        await queryRunner.query(`COMMENT ON COLUMN "assets"."location_in_room" IS 'Vị trí cụ thể trong phòng'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "assets"."location_in_room" IS 'Vị trí cụ thể trong phòng'`);
        await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "location_in_room"`);
    }

}
