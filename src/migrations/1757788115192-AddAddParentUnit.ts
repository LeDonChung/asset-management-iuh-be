import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddParentUnit1757788115192 implements MigrationInterface {
    name = 'AddAddParentUnit1757788115192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" ADD "parentUnitId" uuid`);
        await queryRunner.query(`COMMENT ON COLUMN "units"."parentUnitId" IS 'ID của đơn vị cha (null nếu là cơ sở root)'`);
        await queryRunner.query(`ALTER TYPE "public"."units_type_enum" RENAME TO "units_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."units_type_enum" AS ENUM('CAMPUS', 'ADMIN_DEPT', 'USER_DEPT')`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "type" TYPE "public"."units_type_enum" USING "type"::"text"::"public"."units_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."units_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_4c17d6e300f4116450dacfbe8dd" FOREIGN KEY ("parentUnitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_4c17d6e300f4116450dacfbe8dd"`);
        await queryRunner.query(`CREATE TYPE "public"."units_type_enum_old" AS ENUM('Campus', 'Planning and Investment Department', 'Administration Department', 'User Department')`);
        await queryRunner.query(`ALTER TABLE "units" ALTER COLUMN "type" TYPE "public"."units_type_enum_old" USING "type"::"text"::"public"."units_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."units_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."units_type_enum_old" RENAME TO "units_type_enum"`);
        await queryRunner.query(`COMMENT ON COLUMN "units"."parentUnitId" IS 'ID của đơn vị cha (null nếu là cơ sở root)'`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "parentUnitId"`);
    }

}
