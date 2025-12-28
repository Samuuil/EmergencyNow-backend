import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProfileMedicalFields1766921312120 implements MigrationInterface {
    name = 'UpdateProfileMedicalFields1766921312120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."profiles_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."profiles_bloodtype_enum" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "height" integer NOT NULL, "weight" integer NOT NULL, "gender" "public"."profiles_gender_enum" NOT NULL, "allergies" text array, "dateOfBirth" date, "bloodType" "public"."profiles_bloodtype_enum", "medicines" text array, "illnesses" text array, CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ambulances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "licensePlate" character varying NOT NULL, "vehicleModel" character varying, "latitude" double precision, "longitude" double precision, "available" boolean NOT NULL DEFAULT true, "driverId" uuid, "lastCallAcceptedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5cc0009e6dc15590597dee5fd50" UNIQUE ("licensePlate"), CONSTRAINT "PK_27dcd0371aa8372b2e451ec596c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."calls_status_enum" AS ENUM('pending', 'dispatched', 'en_route', 'arrived', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "calls" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "description" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "status" "public"."calls_status_enum" NOT NULL DEFAULT 'pending', "routePolyline" text, "estimatedDistance" integer, "estimatedDuration" integer, "routeSteps" json, "ambulanceCurrentLatitude" double precision, "ambulanceCurrentLongitude" double precision, "dispatchedAt" TIMESTAMP, "arrivedAt" TIMESTAMP, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "selectedHospitalId" character varying, "selectedHospitalName" character varying, "hospitalRoutePolyline" text, "hospitalRouteDistance" integer, "hospitalRouteDuration" integer, "hospitalRouteSteps" json, "userId" uuid, "ambulanceId" uuid, CONSTRAINT "PK_d9171d91f8dd1a649659f1b6a20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "email" character varying, "userId" uuid, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "state_archive" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "egn" character varying NOT NULL, "fullName" character varying NOT NULL, "email" character varying NOT NULL, "phoneNumber" character varying NOT NULL, CONSTRAINT "UQ_eaf3877523ffcbb8f02f2a763ec" UNIQUE ("egn"), CONSTRAINT "UQ_605d93c9344d90001681b3413ac" UNIQUE ("email"), CONSTRAINT "PK_6fe187cd48938f478822427a9b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'USER', 'DRIVER')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "refreshToken" character varying, "profileId" uuid, "stateArchiveId" uuid, CONSTRAINT "REL_b1bda35cdb9a2c1b777f5541d8" UNIQUE ("profileId"), CONSTRAINT "REL_aadfbe4d4e0565ccd98100c1da" UNIQUE ("stateArchiveId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hospitals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "phoneNumber" character varying, "placeId" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_02738c80d71453bc3e369a01766" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."verification_codes_method_enum" AS ENUM('email', 'sms')`);
        await queryRunner.query(`CREATE TABLE "verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "egn" character varying NOT NULL, "code" character varying NOT NULL, "method" "public"."verification_codes_method_enum" NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_18741b6b8bf1680dbf5057421d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "calls" ADD CONSTRAINT "FK_c8fa72c7e9c20cf08aa141f8232" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calls" ADD CONSTRAINT "FK_b729eb40727bce18da92cffc8cb" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_30ef77942fc8c05fcb829dcc61d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_b1bda35cdb9a2c1b777f5541d87" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_aadfbe4d4e0565ccd98100c1dac" FOREIGN KEY ("stateArchiveId") REFERENCES "state_archive"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_aadfbe4d4e0565ccd98100c1dac"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_b1bda35cdb9a2c1b777f5541d87"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_30ef77942fc8c05fcb829dcc61d"`);
        await queryRunner.query(`ALTER TABLE "calls" DROP CONSTRAINT "FK_b729eb40727bce18da92cffc8cb"`);
        await queryRunner.query(`ALTER TABLE "calls" DROP CONSTRAINT "FK_c8fa72c7e9c20cf08aa141f8232"`);
        await queryRunner.query(`DROP TABLE "verification_codes"`);
        await queryRunner.query(`DROP TYPE "public"."verification_codes_method_enum"`);
        await queryRunner.query(`DROP TABLE "hospitals"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "state_archive"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP TABLE "calls"`);
        await queryRunner.query(`DROP TYPE "public"."calls_status_enum"`);
        await queryRunner.query(`DROP TABLE "ambulances"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
        await queryRunner.query(`DROP TYPE "public"."profiles_bloodtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."profiles_gender_enum"`);
    }

}
