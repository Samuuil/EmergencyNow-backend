import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeEntityTimestamps1779362731031 implements MigrationInterface {
    name = 'StandardizeEntityTimestamps1779362731031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "calls" DROP CONSTRAINT "FK_calls_assignedDispatcher"`);
        await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_userId"`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "calls" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "state_archive" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "state_archive" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "hospitals" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "verification_codes" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "calls" ADD CONSTRAINT "FK_06ad0812c2e59542587cf86f074" FOREIGN KEY ("assignedDispatcherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_95b226ff93ba9b9edfd06136be0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_95b226ff93ba9b9edfd06136be0"`);
        await queryRunner.query(`ALTER TABLE "calls" DROP CONSTRAINT "FK_06ad0812c2e59542587cf86f074"`);
        await queryRunner.query(`ALTER TABLE "verification_codes" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "hospitals" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "state_archive" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "state_archive" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "calls" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_push_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "calls" ADD CONSTRAINT "FK_calls_assignedDispatcher" FOREIGN KEY ("assignedDispatcherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
