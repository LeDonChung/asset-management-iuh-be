import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeUniqueRoom1758294088341 implements MigrationInterface {
  name = "ChangeUniqueRoom1758294088341";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE rooms
          DROP CONSTRAINT IF EXISTS unique_room_location;
        `);
    await queryRunner.query(`
          ALTER TABLE rooms
          ADD CONSTRAINT unique_room_location
          UNIQUE ("building", "floor", "roomNumber", "unitId");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE rooms
          DROP CONSTRAINT IF EXISTS unique_room_location;
        `);
  }
}
