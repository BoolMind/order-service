import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { OutboxService } from "@ecommerce/common";

@Injectable()
export class OutboxFailureMonitor {
  private readonly logger = new Logger(OutboxFailureMonitor.name);

  constructor(private readonly outboxService: OutboxService) {}

  @Interval(5 * 60_000)
  async checkFailedOutbox(): Promise<void> {
    const failedCount = await this.outboxService.getFailedCount();

    if (failedCount > 0) {
      this.logger.error(
        `${failedCount} outbox row(s) are permanently FAILED and will NOT retry automatically. ` +
          `Investigate and call OutboxService.requeueFailed() once resolved.`,
      );
    }
  }
}
