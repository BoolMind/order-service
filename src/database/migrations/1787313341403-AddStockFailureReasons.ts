import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockFailureReasons1787313341403 implements MigrationInterface {
  name = "AddStockFailureReasons1787313341403";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`orders\` ADD \`failureDetail\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`orders\` CHANGE \`failureReason\` \`failureReason\` enum ('STOCK_UNAVAILABLE', 'PAYMENT_FAILED', 'PRODUCT_NOT_FOUND', 'INSUFFICIENT_STOCK') NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`orders\` CHANGE \`failureReason\` \`failureReason\` enum ('STOCK_UNAVAILABLE', 'PAYMENT_FAILED') NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`orders\` DROP COLUMN \`failureDetail\``,
    );
  }
}
