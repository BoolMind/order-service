import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSagaLeaseToOrders1787156134647 implements MigrationInterface {
  name = "AddSagaLeaseToOrders1787156134647";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`outbox_events\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`aggregateType\` varchar(100) NOT NULL, \`aggregateId\` varchar(100) NOT NULL, \`eventType\` varchar(150) NOT NULL, \`destination\` varchar(100) NOT NULL, \`payload\` json NOT NULL, \`status\` enum ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING', \`attempts\` int NOT NULL DEFAULT '0', \`publishedAt\` timestamp NULL, \`lockedAt\` timestamp NULL, INDEX \`IDX_20aabf8156809552c09e5deb1b\` (\`aggregateType\`), INDEX \`IDX_a24c3217a29817c76d4f7403c5\` (\`aggregateId\`), INDEX \`IDX_733fafe6b0ec20ec7c93fdbbca\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`order_items\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`orderId\` int NOT NULL, \`productId\` int NOT NULL, \`quantity\` int NOT NULL, \`unitPrice\` decimal(12,2) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`orders\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`userId\` int NOT NULL, \`idempotencyKey\` varchar(36) NOT NULL, \`status\` enum ('PENDING', 'STOCK_RESERVING', 'STOCK_RESERVED', 'PAYMENT_PROCESSING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING', \`failureReason\` enum ('STOCK_UNAVAILABLE', 'PAYMENT_FAILED') NULL, \`totalAmount\` decimal(12,2) NOT NULL, \`version\` int NOT NULL, \`sagaClaimId\` varchar(36) NULL, \`sagaClaimedAt\` datetime(6) NULL, \`sagaLeaseExpiresAt\` datetime(6) NULL, \`sagaAttempt\` int NOT NULL DEFAULT '0', INDEX \`IDX_orders_sagaLeaseExpiresAt\` (\`sagaLeaseExpiresAt\`), UNIQUE INDEX \`IDX_orders_idempotencyKey\` (\`idempotencyKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_f1d359a55923bb45b057fbdab0d\` FOREIGN KEY (\`orderId\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_f1d359a55923bb45b057fbdab0d\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_orders_idempotencyKey\` ON \`orders\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_orders_sagaLeaseExpiresAt\` ON \`orders\``,
    );
    await queryRunner.query(`DROP TABLE \`orders\``);
    await queryRunner.query(`DROP TABLE \`order_items\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_733fafe6b0ec20ec7c93fdbbca\` ON \`outbox_events\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_a24c3217a29817c76d4f7403c5\` ON \`outbox_events\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_20aabf8156809552c09e5deb1b\` ON \`outbox_events\``,
    );
    await queryRunner.query(`DROP TABLE \`outbox_events\``);
  }
}
