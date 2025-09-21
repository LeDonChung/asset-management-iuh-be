import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddFileToInventoryResult1758393135371 implements MigrationInterface {
    name = 'AddAddFileToInventoryResult1758393135371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "file_url_inventory_results" ("inventoryResultId" uuid NOT NULL, "fileUrlId" uuid NOT NULL, CONSTRAINT "PK_43f1b9f9b97f8173b8be9b04c34" PRIMARY KEY ("inventoryResultId", "fileUrlId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b5697c63433e3a13b2e505b68" ON "file_url_inventory_results" ("inventoryResultId") `);
        await queryRunner.query(`CREATE INDEX "IDX_626e68013a3e077154bab6159c" ON "file_url_inventory_results" ("fileUrlId") `);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_results" ADD CONSTRAINT "FK_8b5697c63433e3a13b2e505b68f" FOREIGN KEY ("inventoryResultId") REFERENCES "inventory_results"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_results" ADD CONSTRAINT "FK_626e68013a3e077154bab6159c4" FOREIGN KEY ("fileUrlId") REFERENCES "file_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_url_inventory_results" DROP CONSTRAINT "FK_626e68013a3e077154bab6159c4"`);
        await queryRunner.query(`ALTER TABLE "file_url_inventory_results" DROP CONSTRAINT "FK_8b5697c63433e3a13b2e505b68f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_626e68013a3e077154bab6159c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b5697c63433e3a13b2e505b68"`);
        await queryRunner.query(`DROP TABLE "file_url_inventory_results"`);
    }

}
