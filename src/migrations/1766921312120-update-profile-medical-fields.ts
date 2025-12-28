import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProfileMedicalFields1766921312120 implements MigrationInterface {
    name = 'UpdateProfileMedicalFields1766921312120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."profiles_bloodtype_enum" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'OTHER')`);
        
        await queryRunner.query(`ALTER TABLE "profiles" ADD "dateOfBirth" date`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "bloodType" "public"."profiles_bloodtype_enum"`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "medicines" text array`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "illnesses" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "illnesses"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "medicines"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "bloodType"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "dateOfBirth"`);
        
        await queryRunner.query(`DROP TYPE "public"."profiles_bloodtype_enum"`);
    }

}
