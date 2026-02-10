import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameFields1737570000000 implements MigrationInterface {
  name = 'AddUserNameFields1737570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "firstName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "version" integer NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isLocked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "failedLoginAttempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isLocked"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "version"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
  }
}
