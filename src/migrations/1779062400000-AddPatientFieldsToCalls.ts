import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientFieldsToCalls1779062400000 implements MigrationInterface {
  name = 'AddPatientFieldsToCalls1779062400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" ADD IF NOT EXISTS "patientEgn" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD IF NOT EXISTS "patientPhoneNumber" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN IF EXISTS "patientPhoneNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN IF EXISTS "patientEgn"`,
    );
  }
}
