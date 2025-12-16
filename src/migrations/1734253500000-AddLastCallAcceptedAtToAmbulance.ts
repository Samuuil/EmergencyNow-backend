import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastCallAcceptedAtToAmbulance1734253500000 implements MigrationInterface {
    name = 'AddLastCallAcceptedAtToAmbulance1734253500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ambulances" ADD "lastCallAcceptedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ambulances" DROP COLUMN "lastCallAcceptedAt"`);
    }

}
