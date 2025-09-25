import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeRelationShipFileUrlTable1757577391232 implements MigrationInterface {
    name = 'ChangeRelationShipFileUrlTable1757577391232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "file_url_inventory_sessions" ("inventorySessionId" uuid NOT NULL, "fileUrlId" uuid NOT NULL, CONSTRAINT "PK_e15af5952967d565d846040c670" PRIMARY KEY ("inventorySessionId", "fileUrlId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_009bc866d54ac5e77d0ac69608" ON "file_url_inventory_sessions" ("inventorySessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc418d8655be124436a0b2852c" ON "file_url_inventory_sessions" ("fileUrlId") `);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_sessions" ADD CONSTRAINT "FK_009bc866d54ac5e77d0ac696080" FOREIGN KEY ("inventorySessionId") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_sessions" ADD CONSTRAINT "FK_fc418d8655be124436a0b2852cd" FOREIGN KEY ("fileUrlId") REFERENCES "file_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_url_inventory_sessions" DROP CONSTRAINT "FK_fc418d8655be124436a0b2852cd"`);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_sessions" DROP CONSTRAINT "FK_009bc866d54ac5e77d0ac696080"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc418d8655be124436a0b2852c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_009bc866d54ac5e77d0ac69608"`);
        await queryRunner.query(`DROP TABLE "file_url_inventory_sessions"`);
    }

}
