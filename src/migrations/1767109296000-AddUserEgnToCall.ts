import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEgnToCall1767109296000 implements MigrationInterface {
  name = 'AddUserEgnToCall1767109296000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" ADD "userEgn" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "calls" DROP COLUMN "userEgn"`);
  }
}
