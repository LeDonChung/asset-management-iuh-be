import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeRfid1761493296686 implements MigrationInterface {
  name = 'ChangeRfid1761493296686'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rfid_tags" DROP CONSTRAINT "PK_881e91ff60457845d79dc736e74"`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" ALTER COLUMN "rfid_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" ADD CONSTRAINT "PK_ecc3dd7a292c1d6dbe054f219d8" PRIMARY KEY ("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rfid_tags" DROP CONSTRAINT "PK_ecc3dd7a292c1d6dbe054f219d8"`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" ALTER COLUMN "rfid_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" ADD CONSTRAINT "PK_881e91ff60457845d79dc736e74" PRIMARY KEY ("rfid_id")`);
    await queryRunner.query(`ALTER TABLE "rfid_tags" DROP COLUMN "id"`);
  }
}
