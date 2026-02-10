import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssessmentSchema1737370000000 implements MigrationInterface {
  name = 'AddAssessmentSchema1737370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "control_group_enum" AS ENUM ('IG1', 'IG2', 'IG3')
    `);

    await queryRunner.query(`
      CREATE TYPE "control_type_enum" AS ENUM ('technical', 'organizational')
    `);

    await queryRunner.query(`
      CREATE TYPE "submission_status_enum" AS ENUM (
        'draft', 'in_progress', 'completed', 'passed', 'failed', 'withdrawn'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "certification_result_enum" AS ENUM ('pass', 'fail')
    `);

    await queryRunner.query(`
      CREATE TYPE "compliance_status_enum" AS ENUM (
        'compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'not_tested'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_templates" (
        "id" UUID PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "version" INT NOT NULL DEFAULT 1,
        "is_published" BOOLEAN NOT NULL DEFAULT false,
        "parent_version_id" UUID,
        "effective_from" DATE,
        "effective_to" DATE,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_templates_parent" FOREIGN KEY ("parent_version_id")
          REFERENCES "assessment_templates"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_template_name_version" UNIQUE ("name", "version")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_categories" (
        "id" UUID PRIMARY KEY,
        "template_id" UUID NOT NULL REFERENCES "assessment_templates"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "weight" DECIMAL(5, 4) NOT NULL,
        "sort_order" INT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "criteria" (
        "id" UUID PRIMARY KEY,
        "category_id" UUID NOT NULL REFERENCES "assessment_categories"("id") ON DELETE CASCADE,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "guidance" TEXT,
        "weight" DECIMAL(5, 4) NOT NULL,
        "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
        "is_critical_fail" BOOLEAN NOT NULL DEFAULT false,
        "min_passing_score" INT NOT NULL DEFAULT 0,
        "max_score" INT NOT NULL DEFAULT 100,
        "evidence_required" BOOLEAN NOT NULL DEFAULT false,
        "evidence_description" TEXT,
        "sort_order" INT NOT NULL,
        "control_group" "control_group_enum" NOT NULL DEFAULT 'IG1',
        "control_type" "control_type_enum" NOT NULL DEFAULT 'technical',
        "cis_mapping" VARCHAR(50),
        "verification_method" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_criteria_category_code" UNIQUE ("category_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "implementations" (
        "id" UUID PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "country" VARCHAR(100),
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "description" TEXT,
        "dhis2_instance_url" VARCHAR(500),
        "dhis2_version" VARCHAR(50),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "submissions" (
        "id" UUID PRIMARY KEY,
        "implementation_id" UUID NOT NULL REFERENCES "implementations"("id") ON DELETE CASCADE,
        "template_id" UUID NOT NULL REFERENCES "assessment_templates"("id") ON DELETE RESTRICT,
        "target_control_group" "control_group_enum" NOT NULL DEFAULT 'IG1',
        "status" "submission_status_enum" NOT NULL DEFAULT 'draft',
        "assessor_name" VARCHAR(255),
        "assessment_date" DATE,
        "system_environment" TEXT,
        "current_category_index" INT NOT NULL DEFAULT 0,
        "total_score" DECIMAL(10, 4),
        "certification_result" "certification_result_enum",
        "is_certified" BOOLEAN NOT NULL DEFAULT false,
        "certificate_number" VARCHAR(100),
        "completed_at" TIMESTAMPTZ,
        "finalized_at" TIMESTAMPTZ,
        "assessor_notes" TEXT,
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "submission_responses" (
        "id" UUID PRIMARY KEY,
        "submission_id" UUID NOT NULL REFERENCES "submissions"("id") ON DELETE CASCADE,
        "criterion_id" UUID NOT NULL REFERENCES "criteria"("id") ON DELETE RESTRICT,
        "compliance_status" "compliance_status_enum" NOT NULL DEFAULT 'not_tested',
        "score" DECIMAL(10, 4),
        "findings" TEXT,
        "evidence_notes" TEXT,
        "remediation_required" BOOLEAN NOT NULL DEFAULT false,
        "remediation_target_date" DATE,
        "remediation_owner" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_response_submission_criterion" UNIQUE ("submission_id", "criterion_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_templates_name" ON "assessment_templates"("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_templates_published" ON "assessment_templates"("is_published")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_categories_template" ON "assessment_categories"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_criteria_category" ON "criteria"("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_criteria_control_group" ON "criteria"("control_group")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_criteria_control_type" ON "criteria"("control_type")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_implementations_name" ON "implementations"("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_implementations_active" ON "implementations"("is_active")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_submissions_implementation" ON "submissions"("implementation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_template" ON "submissions"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_status" ON "submissions"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submissions_created_by" ON "submissions"("created_by")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_responses_submission" ON "submission_responses"("submission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_responses_criterion" ON "submission_responses"("criterion_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "isDefault")
      VALUES
        ('admin', 'Administrator with full access', false),
        ('assessor', 'Assessor who conducts certifications', false)
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_responses_criterion"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_responses_submission"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_submissions_created_by"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_submissions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_submissions_template"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_submissions_implementation"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_implementations_active"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_implementations_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_criteria_control_type"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_criteria_control_group"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_criteria_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_template"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_templates_published"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_templates_name"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "submission_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "implementations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "criteria"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessment_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessment_templates"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "compliance_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "certification_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submission_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "control_group_enum"`);

    await queryRunner.query(
      `DELETE FROM "roles" WHERE "name" IN ('admin', 'assessor')`,
    );
  }
}
