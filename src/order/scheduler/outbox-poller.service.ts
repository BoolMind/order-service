import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { OutboxService } from "@ecommerce/common";
import { OrderOutboxPublisher } from "../../messaging/kafka/order-outbox.publisher";

@Injectable()
export class OutboxPollerService {
  private readonly logger = new Logger(OutboxPollerService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly publisher: OrderOutboxPublisher,
  ) {}

  @Interval(2000)
  async poll(): Promise<void> {
    try {
      await this.outboxService.pollAndPublish(this.publisher);
    } catch (error) {
      this.logger.error(`Outbox poll failed: ${(error as Error).message}`);
    }
  }
}
