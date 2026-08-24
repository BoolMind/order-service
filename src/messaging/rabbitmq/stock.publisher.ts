import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { catchError, firstValueFrom, of, timeout } from "rxjs";
import { STOCK_RESERVE_QUEUE, injectTraceContext } from "@ecommerce/common";

export interface StockReservedItemPrice {
  productId: number;
  quantity: number;
  unitPrice: string;
}

export interface StockReservationResult {
  success: boolean;
  reason?: string;

  items?: StockReservedItemPrice[];
}

export interface StockReservationItem {
  productId: number;
  quantity: number;
}

function isValidReservationResult(
  value: unknown,
): value is StockReservationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success: unknown }).success === "boolean"
  );
}

@Injectable()
export class StockPublisher {
  private readonly logger = new Logger(StockPublisher.name);

  constructor(@Inject("STOCK_SERVICE") private readonly client: ClientProxy) {}

  async reserveStock(
    orderId: number,
    items: StockReservationItem[],
  ): Promise<StockReservationResult> {
    const headers: Record<string, string> = {};
    injectTraceContext(headers);

    return firstValueFrom(
      this.client
        .send<unknown>(STOCK_RESERVE_QUEUE, { orderId, items, headers })
        .pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.warn(
              `stock.reserve failed for order ${orderId}: ${(error as Error).message}`,
            );
            return of<StockReservationResult>({
              success: false,
              reason: "STOCK_SERVICE_UNAVAILABLE",
            });
          }),
        ),
    ).then((result) => {
      if (!isValidReservationResult(result)) {
        this.logger.error(
          `stock.reserve returned malformed reply for order ${orderId}: ${JSON.stringify(result)}`,
        );
        return { success: false, reason: "MALFORMED_REPLY" };
      }
      return result;
    });
  }
}
