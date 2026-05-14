import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNavigatingToHospitalStatus1779201927483 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."calls_status_enum" ADD VALUE IF NOT EXISTS 'navigating_to_hospital' AFTER 'arrived'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
