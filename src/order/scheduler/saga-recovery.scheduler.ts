import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, IsNull, Repository } from "typeorm";

import { OrderEntity } from "../entities/order.entity";
import { OrderStatus } from "../interfaces/order-status.enum";
import { OrderService } from "../order.service";

@Injectable()
export class SagaRecoveryScheduler {
  private readonly logger = new Logger(SagaRecoveryScheduler.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    private readonly orderService: OrderService,
  ) {}

  @Interval(10_000)
  async recoverStuckOrders(): Promise<void> {
    const unclaimedOrders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.status IN (:...statuses)", {
        statuses: [OrderStatus.PENDING, OrderStatus.STOCK_RESERVED],
      })
      .andWhere("order.sagaClaimId IS NULL")
      .orderBy("order.id", "ASC")
      .take(50)
      .getMany();

    for (const order of unclaimedOrders) {
      try {
        await this.orderService.runSaga(order.id);
      } catch (error) {
        this.logger.error(
          `Saga recovery failed for unclaimed order ${order.id}: ${
            (error as Error).message
          }`,
        );
      }
    }

    const expiredOrders = await this.orderRepository
      .createQueryBuilder("order")
      .where("order.status IN (:...statuses)", {
        statuses: [OrderStatus.STOCK_RESERVING, OrderStatus.PAYMENT_PROCESSING],
      })
      .andWhere(
        "(order.sagaLeaseExpiresAt IS NULL OR order.sagaLeaseExpiresAt < CURRENT_TIMESTAMP(6))",
      )
      .orderBy("order.id", "ASC")
      .take(50)
      .getMany();

    for (const order of expiredOrders) {
      try {
        await this.orderService.reclaimAndRunStep(order.id, order.status);
      } catch (error) {
        this.logger.error(
          `Saga recovery failed for expired order ${order.id}: ${
            (error as Error).message
          }`,
        );
      }
    }
  }
}
