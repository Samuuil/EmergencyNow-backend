import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHospitalFieldsToCall1765109876365 implements MigrationInterface {
  name = 'AddHospitalFieldsToCall1765109876365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "selectedHospitalId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "selectedHospitalName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "hospitalRoutePolyline" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "hospitalRouteDistance" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "hospitalRouteDuration" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "hospitalRouteSteps" json`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "hospitalRouteSteps"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "hospitalRouteDuration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "hospitalRouteDistance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "hospitalRoutePolyline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "selectedHospitalName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "selectedHospitalId"`,
    );
  }
}
