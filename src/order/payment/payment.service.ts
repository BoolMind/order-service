import { Injectable, Logger } from "@nestjs/common";
import { OrderEntity } from "../entities/order.entity";

export interface PaymentResult {
  success: boolean;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly FAILURE_RATE = 0.2;

  async processPayment(
    order: OrderEntity,
    paymentIdempotencyKey: string,
  ): Promise<PaymentResult> {
    this.logger.debug(
      `Processing payment for order ${order.id} with idempotency key ${paymentIdempotencyKey}`,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 400),
    );
    const success = Math.random() >= this.FAILURE_RATE;
    this.logger.log(
      `Payment ${success ? "succeeded" : "failed"} for order ${order.id}`,
    );
    return { success };
  }
}
