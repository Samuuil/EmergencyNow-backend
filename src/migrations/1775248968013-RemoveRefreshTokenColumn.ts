import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRefreshTokenColumn1775248968013 implements MigrationInterface {
    name = 'RemoveRefreshTokenColumn1775248968013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" character varying`);
    }

}
