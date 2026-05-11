import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDispatcherSupport1778457600000 implements MigrationInterface {
  name = 'AddDispatcherSupport1778457600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'DISPATCHER'
      ) THEN
        EXECUTE 'ALTER TYPE "public"."users_role_enum" ADD VALUE ''DISPATCHER''';
      END IF;
    END
    $$;`);

    await queryRunner.query(
      `ALTER TABLE "calls" ADD IF NOT EXISTS "assignedDispatcherId" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "calls" ADD IF NOT EXISTS "dispatcherAssignedAt" TIMESTAMP`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_calls_assignedDispatcher'
          AND table_name = 'calls'
        ) THEN
          ALTER TABLE "calls" ADD CONSTRAINT "FK_calls_assignedDispatcher"
            FOREIGN KEY ("assignedDispatcherId") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" DROP CONSTRAINT IF EXISTS "FK_calls_assignedDispatcher"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN IF EXISTS "dispatcherAssignedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN IF EXISTS "assignedDispatcherId"`,
    );
  }
}
