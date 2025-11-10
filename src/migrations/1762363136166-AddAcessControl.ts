import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAcessControl1762363136166 implements MigrationInterface {
    name = 'AddAcessControl1762363136166'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."access_scopes_type_enum" AS ENUM('GLOBAL', 'UNIT', 'CHILD_UNITS', 'SELF')`);
        await queryRunner.query(`CREATE TABLE "access_scopes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."access_scopes_type_enum" NOT NULL, "unitId" uuid, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_746f3ccce9f24c458d64daa1501" PRIMARY KEY ("id")); COMMENT ON COLUMN "access_scopes"."unitId" IS 'Unit ID khi type là UNIT hoặc CHILD_UNITS'`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "accessScopeId" uuid`);
        await queryRunner.query(`ALTER TABLE "access_scopes" ADD CONSTRAINT "FK_e7df29f56caf8a6eef188f16e96" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_76704a0fb6a68e41657b31757ca" FOREIGN KEY ("accessScopeId") REFERENCES "access_scopes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_76704a0fb6a68e41657b31757ca"`);
        await queryRunner.query(`ALTER TABLE "access_scopes" DROP CONSTRAINT "FK_e7df29f56caf8a6eef188f16e96"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "accessScopeId"`);
        await queryRunner.query(`DROP TABLE "access_scopes"`);
        await queryRunner.query(`DROP TYPE "public"."access_scopes_type_enum"`);
    }

}
