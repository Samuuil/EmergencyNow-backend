import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorRoleToUser1766922865000 implements MigrationInterface {
  name = 'AddDoctorRoleToUser1766922865000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'users_role_enum' AND n.nspname = 'public'
      ) THEN
        RAISE EXCEPTION 'Enum type users_role_enum not found in public schema';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'DOCTOR'
      ) THEN
        EXECUTE 'ALTER TYPE "public"."users_role_enum" ADD VALUE ''DOCTOR''';
      END IF;
    END
    $$;`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
