import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorControlGroupToDSCP11737470000000 implements MigrationInterface {
  name = 'RefactorControlGroupToDSCP11737470000000';

  private async tableExists(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<boolean> {
    const result = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ) as exists
    `)) as { exists: boolean }[];
    return result[0]?.exists ?? false;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "control_group_enum" ADD VALUE IF NOT EXISTS 'DSCP1'
    `);

    await queryRunner.query(`
      UPDATE "criteria"
      SET "control_group" = 'DSCP1'
      WHERE "control_group" IN ('IG1', 'IG2', 'IG3')
    `);

    await queryRunner.query(`
      UPDATE "submissions"
      SET "target_control_group" = 'DSCP1'
      WHERE "target_control_group" IN ('IG1', 'IG2', 'IG3')
    `);

    const certificatesExists = await this.tableExists(
      queryRunner,
      'certificates',
    );
    if (certificatesExists) {
      await queryRunner.query(`
        UPDATE "certificates"
        SET "control_group" = 'DSCP1'
        WHERE "control_group" IN ('IG1', 'IG2', 'IG3')
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "criteria"
      ALTER COLUMN "control_group" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "target_control_group" DROP DEFAULT
    `);

    await queryRunner.query(`
      CREATE TYPE "control_group_enum_new" AS ENUM ('DSCP1')
    `);

    await queryRunner.query(`
      ALTER TABLE "criteria"
      ALTER COLUMN "control_group" TYPE "control_group_enum_new"
      USING "control_group"::text::"control_group_enum_new"
    `);

    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "target_control_group" TYPE "control_group_enum_new"
      USING "target_control_group"::text::"control_group_enum_new"
    `);

    if (certificatesExists) {
      await queryRunner.query(`
        ALTER TABLE "certificates"
        ALTER COLUMN "control_group" TYPE "control_group_enum_new"
        USING "control_group"::text::"control_group_enum_new"
      `);
    }

    await queryRunner.query(`
      DROP TYPE "control_group_enum"
    `);

    await queryRunner.query(`
      ALTER TYPE "control_group_enum_new" RENAME TO "control_group_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "criteria"
      ALTER COLUMN "control_group" SET DEFAULT 'DSCP1'
    `);

    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "target_control_group" SET DEFAULT 'DSCP1'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "control_group_enum_old" AS ENUM ('IG1', 'IG2', 'IG3')
    `);

    await queryRunner.query(`
      ALTER TABLE "criteria"
      ALTER COLUMN "control_group" TYPE "control_group_enum_old"
      USING 'IG1'::"control_group_enum_old"
    `);

    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "target_control_group" TYPE "control_group_enum_old"
      USING 'IG1'::"control_group_enum_old"
    `);

    const certificatesExists = await this.tableExists(
      queryRunner,
      'certificates',
    );
    if (certificatesExists) {
      await queryRunner.query(`
        ALTER TABLE "certificates"
        ALTER COLUMN "control_group" TYPE "control_group_enum_old"
        USING 'IG1'::"control_group_enum_old"
      `);
    }

    await queryRunner.query(`
      DROP TYPE "control_group_enum"
    `);

    await queryRunner.query(`
      ALTER TYPE "control_group_enum_old" RENAME TO "control_group_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "criteria"
      ALTER COLUMN "control_group" SET DEFAULT 'IG1'
    `);

    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "target_control_group" SET DEFAULT 'IG1'
    `);
  }
}
