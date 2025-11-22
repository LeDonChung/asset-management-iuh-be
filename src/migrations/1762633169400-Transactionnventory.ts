import { MigrationInterface, QueryRunner } from "typeorm";

export class Transactionnventory1762633169400 implements MigrationInterface {
    name = 'Transactionnventory1762633169400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."asset_transaction_histories_old_status_enum" RENAME TO "asset_transaction_histories_old_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_old_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'RECEIVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ALTER COLUMN "old_status" TYPE "public"."asset_transaction_histories_old_status_enum" USING "old_status"::"text"::"public"."asset_transaction_histories_old_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_old_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_transaction_histories_new_status_enum" RENAME TO "asset_transaction_histories_new_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_new_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'RECEIVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ALTER COLUMN "new_status" TYPE "public"."asset_transaction_histories_new_status_enum" USING "new_status"::"text"::"public"."asset_transaction_histories_new_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_new_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_transactions_status_enum" RENAME TO "asset_transactions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transactions_status_enum" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'RECEIVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" TYPE "public"."asset_transactions_status_enum" USING "status"::"text"::"public"."asset_transactions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."asset_transactions_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."asset_transactions_status_enum_old" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" TYPE "public"."asset_transactions_status_enum_old" USING "status"::"text"::"public"."asset_transactions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "asset_transactions" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."asset_transactions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_transactions_status_enum_old" RENAME TO "asset_transactions_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_new_status_enum_old" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ALTER COLUMN "new_status" TYPE "public"."asset_transaction_histories_new_status_enum_old" USING "new_status"::"text"::"public"."asset_transaction_histories_new_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_new_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_transaction_histories_new_status_enum_old" RENAME TO "asset_transaction_histories_new_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."asset_transaction_histories_old_status_enum_old" AS ENUM('DRAFT', 'PROPOSED', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "asset_transaction_histories" ALTER COLUMN "old_status" TYPE "public"."asset_transaction_histories_old_status_enum_old" USING "old_status"::"text"::"public"."asset_transaction_histories_old_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."asset_transaction_histories_old_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."asset_transaction_histories_old_status_enum_old" RENAME TO "asset_transaction_histories_old_status_enum"`);
    }

}
