import { MigrationInterface, QueryRunner } from "typeorm";

export class UnitAndRoomTable1757519229110 implements MigrationInterface {
    name = 'UnitAndRoomTable1757519229110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."rooms_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "building" character varying NOT NULL, "roomCode" character varying(100) NOT NULL, "floor" character varying NOT NULL, "roomNumber" character varying NOT NULL, "status" "public"."rooms_status_enum" NOT NULL DEFAULT 'ACTIVE', "unitId" uuid, "createdBy" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_218122bdbe19989effd16195807" UNIQUE ("roomCode"), CONSTRAINT "unique_room_location" UNIQUE ("building", "floor", "roomNumber"), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "units" ADD "unitCode" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "UQ_865e860392ff3efd4bed42ba466" UNIQUE ("unitCode")`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "createdBy"`);
        await queryRunner.query(`ALTER TABLE "units" ADD "createdBy" uuid`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_37242bee4f13c003a00a34111a0" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_054f341a286d38c25ca2b89e530" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_8cb713191aecd44736e4c4d2c3b" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_8cb713191aecd44736e4c4d2c3b"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_054f341a286d38c25ca2b89e530"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_37242bee4f13c003a00a34111a0"`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "createdBy"`);
        await queryRunner.query(`ALTER TABLE "units" ADD "createdBy" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "UQ_865e860392ff3efd4bed42ba466"`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "unitCode"`);
        await queryRunner.query(`DROP TABLE "rooms"`);
        await queryRunner.query(`DROP TYPE "public"."rooms_status_enum"`);
    }

}
