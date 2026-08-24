import {
  Inject,
  Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  MessagingException,
  OutboxPublisher,
  RabbitMqConfirmPublisher,
} from "@ecommerce/common";
import {
  OutboxEntity,
} from "@ecommerce/common/persistence";

@Injectable()
export class OrderOutboxPublisher implements OutboxPublisher {
  constructor(
    @Inject("ORDER_EVENTS_PRODUCER") private readonly kafkaClient: ClientKafka,
    private readonly rabbitConfirmPublisher: RabbitMqConfirmPublisher,
  ) {}

  async publish(entry: OutboxEntity): Promise<void> {
    const [transport, target] = entry.destination.split(":");

    if (transport === "kafka") {
      await firstValueFrom(
        this.kafkaClient.emit(target, {
          key: entry.aggregateId,
          value: entry.payload,
        }),
      );
      return;
    }

    if (transport === "rabbitmq") {
      await this.rabbitConfirmPublisher.publish(target, entry.payload);
      return;
    }

    throw new MessagingException(
      `Unknown outbox destination "${entry.destination}" for outbox row ${entry.id}`,
    );
  }
}
