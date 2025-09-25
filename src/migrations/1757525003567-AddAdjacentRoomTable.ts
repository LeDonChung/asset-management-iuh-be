import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdjacentRoomTable1757525003567 implements MigrationInterface {
    name = 'AddAdjacentRoomTable1757525003567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "room_adjacent_rooms" ("roomId" uuid NOT NULL, "adjacentRoomId" uuid NOT NULL, CONSTRAINT "PK_416bd0eacb14ff6da49dad9dc52" PRIMARY KEY ("roomId", "adjacentRoomId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_530d7102214ea5a72402a12634" ON "room_adjacent_rooms" ("roomId") `);
        await queryRunner.query(`CREATE INDEX "IDX_60a0dfcf628be50b1f19480c0f" ON "room_adjacent_rooms" ("adjacentRoomId") `);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "room_adjacent_rooms" ADD CONSTRAINT "FK_530d7102214ea5a72402a12634c" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "room_adjacent_rooms" ADD CONSTRAINT "FK_60a0dfcf628be50b1f19480c0f3" FOREIGN KEY ("adjacentRoomId") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_adjacent_rooms" DROP CONSTRAINT "FK_60a0dfcf628be50b1f19480c0f3"`);
        await queryRunner.query(`ALTER TABLE "room_adjacent_rooms" DROP CONSTRAINT "FK_530d7102214ea5a72402a12634c"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_60a0dfcf628be50b1f19480c0f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_530d7102214ea5a72402a12634"`);
        await queryRunner.query(`DROP TABLE "room_adjacent_rooms"`);
    }

}
