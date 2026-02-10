import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1737270000000 implements MigrationInterface {
  name = 'InitialSchema1737270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL UNIQUE,
        "description" VARCHAR,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY,
        "email" VARCHAR NOT NULL UNIQUE,
        "password" VARCHAR,
        "role_id" INTEGER,
        "isTfaEnabled" BOOLEAN NOT NULL DEFAULT false,
        "tfaSecret" VARCHAR,
        "tfaRecoveryCodes" TEXT[],
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role_id" ON "users" ("role_id")`,
    );
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "isDefault")
      VALUES ('user', 'Default user role', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
