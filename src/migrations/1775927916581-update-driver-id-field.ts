import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDriverIdField1775927916581 implements MigrationInterface {
    name = 'UpdateDriverIdField1775927916581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ambulances" ADD CONSTRAINT "FK_0621f92d329d3ddec930a0c1ced" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ambulances" DROP CONSTRAINT "FK_0621f92d329d3ddec930a0c1ced"`);
    }

}
