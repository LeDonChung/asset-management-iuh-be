import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTable1757142567410 implements MigrationInterface {
    name = 'InitTable1757142567410'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."units_type_enum" AS ENUM('Campus', 'Planning and Investment Department', 'Administration Department', 'User Department')`);
        await queryRunner.query(`CREATE TYPE "public"."units_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phone" character varying, "email" character varying, "type" "public"."units_type_enum" NOT NULL, "representativeId" uuid, "status" "public"."units_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdBy" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'LOCKED', 'DELETED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "fullName" character varying NOT NULL, "email" character varying NOT NULL, "unitId" uuid, "phoneNumber" character varying, "birthDate" date, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "manager_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_2204ee43fe6df5ba76d7d8239fd" UNIQUE ("name"), CONSTRAINT "PK_e746fe6ba1f191a59bf3cd07d5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_roles" ("userId" uuid NOT NULL, "roleId" uuid NOT NULL, CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475" PRIMARY KEY ("userId", "roleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_472b25323af01488f1f66a06b6" ON "user_roles" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_86033897c009fcca8b6505d6be" ON "user_roles" ("roleId") `);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b4599f8b8f548d35850afa2d12" ON "role_permissions" ("roleId") `);
        await queryRunner.query(`CREATE INDEX "IDX_06792d0c62ce6b0203c03643cd" ON "role_permissions" ("permissionId") `);
        await queryRunner.query(`CREATE TABLE "manager_permission_permissions" ("managerPermissionId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_516593cab632bd8685bd4ccf10b" PRIMARY KEY ("managerPermissionId", "permissionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98ad5b3f9c8ca5ded3f1ed191f" ON "manager_permission_permissions" ("managerPermissionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2b273b839a9851139985630581" ON "manager_permission_permissions" ("permissionId") `);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "FK_9e151a3fcb6d54fd7434b3f9b6a" FOREIGN KEY ("representativeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_573707d34e5b3252f03b728b3f5" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "manager_permission_permissions" ADD CONSTRAINT "FK_98ad5b3f9c8ca5ded3f1ed191f8" FOREIGN KEY ("managerPermissionId") REFERENCES "manager_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "manager_permission_permissions" ADD CONSTRAINT "FK_2b273b839a98511399856305813" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "manager_permission_permissions" DROP CONSTRAINT "FK_2b273b839a98511399856305813"`);
        await queryRunner.query(`ALTER TABLE "manager_permission_permissions" DROP CONSTRAINT "FK_98ad5b3f9c8ca5ded3f1ed191f8"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_573707d34e5b3252f03b728b3f5"`);
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "FK_9e151a3fcb6d54fd7434b3f9b6a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b273b839a9851139985630581"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98ad5b3f9c8ca5ded3f1ed191f"`);
        await queryRunner.query(`DROP TABLE "manager_permission_permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06792d0c62ce6b0203c03643cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b4599f8b8f548d35850afa2d12"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86033897c009fcca8b6505d6be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_472b25323af01488f1f66a06b6"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP TABLE "manager_permissions"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TABLE "units"`);
        await queryRunner.query(`DROP TYPE "public"."units_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."units_type_enum"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
