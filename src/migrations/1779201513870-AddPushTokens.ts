import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushTokens1779201513870 implements MigrationInterface {
  name = 'AddPushTokens1779201513870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "lastSeenAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_push_tokens_token" UNIQUE ("token"),
        CONSTRAINT "PK_push_tokens_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_user_id" ON "push_tokens" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_push_tokens_userId"
       FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_tokens" DROP CONSTRAINT IF EXISTS "FK_push_tokens_userId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_tokens"`);
  }
}
