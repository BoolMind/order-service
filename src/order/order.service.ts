import {
  Injectable,
  Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource,
  Repository } from "typeorm";
import Decimal from "decimal.js";

import {
  BaseService,
  ORDER_EVENTS_TOPIC,
  STOCK_RELEASE_QUEUE,
} from "@ecommerce/common";
import {
  OutboxService,
} from "@ecommerce/common/persistence";

import { CreateOrderRequest } from "@ecommerce/contracts/generated/ecommerce/order/v1/order";

import { OrderEntity, OrderItemEntity } from "./entities";
import { OrderFailureReason, OrderStatus } from "./interfaces";

import { PaymentService } from "./payment";
import { CatalogGrpcClient, UserGrpcClient } from "../grpc";
import { StockPublisher } from "../messaging";
import { isDuplicateKeyError } from "./utils";
import {
  OrderNotFoundException,
  OrderStockReservationException,
  OrderValidationException,
} from "./exceptions";

import { MAX_ITEM_QUANTITY, MAX_ORDER_ITEMS, SAGA_LEASE_MS } from "./constants";

@Injectable()
export class OrderService extends BaseService<
  OrderEntity,
  CreateOrderRequest,
  Partial<CreateOrderRequest>
> {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,

    private readonly dataSource: DataSource,

    private readonly stockPublisher: StockPublisher,

    private readonly paymentService: PaymentService,

    private readonly outboxService: OutboxService,

    private readonly userGrpcClient: UserGrpcClient,

    private readonly catalogGrpcClient: CatalogGrpcClient,
  ) {
    super(orderRepository);
  }

  protected override entityName(): string {
    return "Order";
  }

  protected override createNotFoundException(id: number): Error {
    return new OrderNotFoundException(id);
  }
  protected override sortableFields(): (keyof OrderEntity)[] {
    return ["id", "createdAt", "updatedAt", "totalAmount", "status"];
  }
  private static readonly MAX_ORDER_ITEMS = MAX_ORDER_ITEMS;
  private static readonly MAX_ITEM_QUANTITY = MAX_ITEM_QUANTITY;

  private validateCreateOrderRequest(request: CreateOrderRequest): void {
    if (
      !Number.isInteger(Number(request.userId)) ||
      Number(request.userId) <= 0
    ) {
      throw new OrderValidationException("userId must be a positive integer");
    }

    if (
      typeof request.idempotencyKey !== "string" ||
      request.idempotencyKey.length === 0
    ) {
      throw new OrderValidationException("idempotencyKey is required");
    }

    if (request.idempotencyKey.length > 36) {
      throw new OrderValidationException(
        "idempotencyKey must be at most 36 characters",
      );
    }

    if (!Array.isArray(request.items) || request.items.length === 0) {
      throw new OrderValidationException(
        "items must contain at least one item",
      );
    }

    if (request.items.length > MAX_ORDER_ITEMS) {
      throw new OrderValidationException(
        `items must contain at most ${MAX_ORDER_ITEMS} items`,
      );
    }

    for (const item of request.items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new OrderValidationException(
          `productId must be positive: ${item.productId}`,
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > MAX_ITEM_QUANTITY
      ) {
        throw new OrderValidationException(
          `quantity is invalid for product ${item.productId}`,
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new OrderValidationException(
          `unitPrice is invalid for product ${item.productId}`,
        );
      }
    }
  }

  async findByIdOrFail(orderId: number): Promise<OrderEntity> {
    return super.findOneOrFail(orderId, {
      relations: {
        items: true,
      },
    });
  }

  async listOrders(
    page = 1,
    limit = 20,
  ): Promise<{ data: OrderEntity[]; total: number }> {
    const result = await this.paginate({
      page,
      limit,
    });

    return {
      data: result.data,
      total: result.meta.totalItems,
    };
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderEntity> {
    this.validateCreateOrderRequest(request);

    await this.userGrpcClient.getById(Number(request.userId));

    const existing = await this.findOne({
      where: {
        idempotencyKey: request.idempotencyKey,
      },
      relations: {
        items: true,
      },
    });

    if (existing) {
      this.logger.log(
        `Idempotent replay for key ${request.idempotencyKey}, returning existing order ${existing.id}`,
      );

      return existing;
    }

    const productIds = request.items.map((item) => Number(item.productId));
    const productsById = await this.catalogGrpcClient.getByIds(productIds);

    for (const productId of productIds) {
      if (!productsById.has(productId)) {
        throw new OrderValidationException(
          `Product ${productId} was not returned by catalog-service`,
        );
      }
    }

    let order: OrderEntity;

    try {
      order = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(OrderEntity);

        const totalAmount = request.items
          .reduce((sum, item) => {
            const product = productsById.get(Number(item.productId));

            if (!product) {
              throw new OrderValidationException(
                `Product ${item.productId} was not returned by catalog-service`,
              );
            }

            const authoritativePrice = Number(product.price);

            if (!Number.isFinite(authoritativePrice) || authoritativePrice < 0) {
              throw new OrderValidationException(
                `Catalog returned an invalid price for product ${item.productId}`,
              );
            }

            return sum.plus(
              new Decimal(authoritativePrice).times(item.quantity),
            );
          }, new Decimal(0))
          .toFixed(2);

        const draft = repo.create({
          userId: Number(request.userId),
          idempotencyKey: request.idempotencyKey,
          status: OrderStatus.PENDING,
          totalAmount,
        });

        draft.items = request.items.map((item) => {
          const product = productsById.get(Number(item.productId));

          if (!product) {
            throw new OrderValidationException(
              `Product ${item.productId} was not returned by catalog-service`,
            );
          }

          const authoritativePrice = Number(product.price);

          if (!Number.isFinite(authoritativePrice) || authoritativePrice < 0) {
            throw new OrderValidationException(
              `Catalog returned an invalid price for product ${item.productId}`,
            );
          }

          const orderItem = new OrderItemEntity();

          orderItem.productId = Number(item.productId);
          orderItem.quantity = item.quantity;
          orderItem.unitPrice = new Decimal(authoritativePrice).toFixed(2);
          orderItem.order = draft;

          return orderItem;
        });

        const saved: OrderEntity = await repo.save(draft);

        await this.outboxService.saveToOutbox(manager, {
          aggregateType: "Order",
          aggregateId: String(saved.id),
          eventType: "order.created",
          destination: `kafka:${ORDER_EVENTS_TOPIC}`,
          payload: {
            orderId: saved.id,
            userId: saved.userId,
            items: saved.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: Number(item.unitPrice),
            })),
            totalAmount: Number(saved.totalAmount),
            createdAt: saved.createdAt.toISOString(),
          },
        });

        return saved;
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        this.logger.warn(
          `Idempotency key race for ${request.idempotencyKey}, returning winning row`,
        );

        return this.orderRepository.findOneOrFail({
          where: {
            idempotencyKey: request.idempotencyKey,
          },
          relations: {
            items: true,
          },
        });
      }

      throw error;
    }

    void this.runSaga(order.id).catch((error) => {
      this.logger.error(
        `Saga kickoff failed for order ${order.id}: ${
          (error as Error).message
        }`,
      );
    });

    return order;
  }

  async runSaga(orderId: number): Promise<void> {
    const order = await this.findByIdOrFail(orderId);

    if (order.status === OrderStatus.PENDING) {
      const claimId = await this.tryClaim(
        orderId,
        OrderStatus.PENDING,
        OrderStatus.STOCK_RESERVING,
      );

      if (!claimId) {
        this.logger.debug(
          `Order ${orderId} already claimed for stock reservation, skipping`,
        );

        return;
      }

      await this.reserveStockStep(orderId, claimId);
    }

    const refreshed = await this.findByIdOrFail(orderId);

    if (refreshed.status === OrderStatus.STOCK_RESERVED) {
      const claimId = await this.tryClaim(
        orderId,
        OrderStatus.STOCK_RESERVED,
        OrderStatus.PAYMENT_PROCESSING,
      );

      if (!claimId) {
        this.logger.debug(
          `Order ${orderId} already claimed for payment, skipping`,
        );

        return;
      }

      await this.processPaymentStep(orderId, claimId);
    }
  }

  private async tryClaim(
    orderId: number,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<string | null> {
    const claimId = randomUUID();
    const claimedAt = new Date();

    const leaseExpiresAt = new Date(claimedAt.getTime() + SAGA_LEASE_MS);

    const result = await this.orderRepository
      .createQueryBuilder()
      .update(OrderEntity)
      .set({
        status: to,
        sagaClaimId: claimId,
        sagaClaimedAt: claimedAt,
        sagaLeaseExpiresAt: leaseExpiresAt,
        sagaAttempt: () => "sagaAttempt + 1",
      })
      .where("id = :orderId", { orderId })
      .andWhere("status = :from", { from })
      .execute();

    if ((result.affected ?? 0) === 0) {
      return null;
    }

    this.logger.debug(
      `Saga claim acquired for order ${orderId}: ` +
        `claim=${claimId}, step=${to}, expires=${leaseExpiresAt.toISOString()}`,
    );

    return claimId;
  }

  async reserveStockStep(orderId: number, claimId: string): Promise<void> {
    const order = await this.findByIdOrFail(orderId);

    const result = await this.stockPublisher.reserveStock(
      order.id,
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderEntity);

      const current = await repo.findOne({
        where: {
          id: orderId,
          sagaClaimId: claimId,
          status: OrderStatus.STOCK_RESERVING,
        },
      });

      if (!current) {
        this.logger.warn(
          `Ignoring stale stock result for order ${orderId}; ` +
            `claim ${claimId} is no longer the active saga claim`,
        );

        return;
      }

      if (result.success) {
        const priceByProductId = new Map(
          (result.items ?? []).map((item) => [item.productId, item.unitPrice]),
        );

        let totalAmount = new Decimal(0);

        for (const item of current.items) {
          const authoritativePrice = priceByProductId.get(item.productId);

          if (authoritativePrice === undefined) {
            throw new OrderStockReservationException(orderId, item.productId);
          }

          if (authoritativePrice !== item.unitPrice) {
            this.logger.warn(
              `Order ${orderId} item ${item.productId}: client-supplied unitPrice ${item.unitPrice} overridden with catalog price ${authoritativePrice}`,
            );
          }

          item.unitPrice = authoritativePrice;
          totalAmount = totalAmount.plus(
            new Decimal(authoritativePrice).times(item.quantity),
          );
        }

        current.totalAmount = totalAmount.toFixed(2);
        current.status = OrderStatus.STOCK_RESERVED;
        current.sagaClaimId = null;
        current.sagaClaimedAt = null;
        current.sagaLeaseExpiresAt = null;

        await repo.save(current);
        return;
      }

      current.status = OrderStatus.CANCELLED;
      current.sagaClaimId = null;
      current.sagaClaimedAt = null;
      current.sagaLeaseExpiresAt = null;

      const rawReason = result.reason ?? "STOCK_UNAVAILABLE";
      current.failureReason = this.resolveStockFailureReason(rawReason);
      current.failureDetail = rawReason;

      await repo.save(current);

      await this.outboxService.saveToOutbox(manager, {
        aggregateType: "Order",
        aggregateId: String(current.id),
        eventType: "order.cancelled",
        destination: `kafka:${ORDER_EVENTS_TOPIC}`,
        payload: {
          orderId: current.id,
          userId: current.userId,
          reason: rawReason,
          cancelledAt: new Date().toISOString(),
        },
      });
    });
  }

  private resolveStockFailureReason(rawReason: string): OrderFailureReason {
    const [code] = rawReason.split(":");

    switch (code) {
      case "PRODUCT_NOT_FOUND":
        return OrderFailureReason.PRODUCT_NOT_FOUND;
      case "INSUFFICIENT_STOCK":
        return OrderFailureReason.INSUFFICIENT_STOCK;
      default:
        return OrderFailureReason.STOCK_UNAVAILABLE;
    }
  }

  async processPaymentStep(orderId: number, claimId: string): Promise<void> {
    const order = await this.findByIdOrFail(orderId);

    const { success } = await this.paymentService.processPayment(
      order,
      `order-payment:${order.id}`,
    );

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderEntity);

      const current = await repo.findOne({
        where: {
          id: orderId,
          sagaClaimId: claimId,
          status: OrderStatus.PAYMENT_PROCESSING,
        },
      });

      if (!current) {
        this.logger.warn(
          `Ignoring stale payment result for order ${orderId}; ` +
            `claim ${claimId} is no longer the active saga claim`,
        );

        return;
      }

      if (success) {
        current.status = OrderStatus.CONFIRMED;
        current.sagaClaimId = null;
        current.sagaClaimedAt = null;
        current.sagaLeaseExpiresAt = null;

        await repo.save(current);

        await this.outboxService.saveToOutbox(manager, {
          aggregateType: "Order",
          aggregateId: String(current.id),
          eventType: "payment.succeeded",
          destination: `kafka:${ORDER_EVENTS_TOPIC}`,
          payload: {
            orderId: current.id,
            userId: current.userId,
            amount: Number(current.totalAmount),
            paidAt: new Date().toISOString(),
          },
        });

        await this.outboxService.saveToOutbox(manager, {
          aggregateType: "Order",
          aggregateId: String(current.id),
          eventType: "order.confirmed",
          destination: `kafka:${ORDER_EVENTS_TOPIC}`,
          payload: {
            orderId: current.id,
            userId: current.userId,
            confirmedAt: new Date().toISOString(),
          },
        });

        return;
      }

      current.status = OrderStatus.CANCELLED;
      current.failureReason = OrderFailureReason.PAYMENT_FAILED;
      current.sagaClaimId = null;
      current.sagaClaimedAt = null;
      current.sagaLeaseExpiresAt = null;

      await repo.save(current);

      await this.outboxService.saveToOutbox(manager, {
        aggregateType: "Order",
        aggregateId: String(current.id),
        eventType: "payment.failed",
        destination: `kafka:${ORDER_EVENTS_TOPIC}`,
        payload: {
          orderId: current.id,
          userId: current.userId,
          reason: String(current.failureReason),
          failedAt: new Date().toISOString(),
        },
      });

      await this.outboxService.saveToOutbox(manager, {
        aggregateType: "Order",
        aggregateId: String(current.id),
        eventType: "order.cancelled",
        destination: `kafka:${ORDER_EVENTS_TOPIC}`,
        payload: {
          orderId: current.id,
          userId: current.userId,
          reason: String(current.failureReason),
          cancelledAt: new Date().toISOString(),
        },
      });

      await this.outboxService.saveToOutbox(manager, {
        aggregateType: "Order",
        aggregateId: String(current.id),
        eventType: "stock.release",
        destination: `rabbitmq:${STOCK_RELEASE_QUEUE}`,
        payload: {
          orderId: current.id,
        },
      });
    });
  }

  async reclaimAndRunStep(
    orderId: number,
    expectedStatus: OrderStatus,
  ): Promise<void> {
    const claimId = randomUUID();
    const claimedAt = new Date();

    const leaseExpiresAt = new Date(claimedAt.getTime() + SAGA_LEASE_MS);

    const result = await this.orderRepository
      .createQueryBuilder()
      .update(OrderEntity)
      .set({
        sagaClaimId: claimId,
        sagaClaimedAt: claimedAt,
        sagaLeaseExpiresAt: leaseExpiresAt,
        sagaAttempt: () => "sagaAttempt + 1",
      })
      .where("id = :orderId", { orderId })
      .andWhere("status = :expectedStatus", {
        expectedStatus,
      })
      .andWhere(
        "(sagaLeaseExpiresAt IS NULL OR sagaLeaseExpiresAt < CURRENT_TIMESTAMP(6))",
      )
      .execute();

    if ((result.affected ?? 0) === 0) {
      this.logger.debug(
        `Order ${orderId} reclaim lost the race, lease is still active, ` +
          `or order already progressed past ${expectedStatus}`,
      );

      return;
    }

    this.logger.warn(
      `Saga lease reclaimed for order ${orderId}: ` +
        `claim=${claimId}, step=${expectedStatus}, ` +
        `newExpiry=${leaseExpiresAt.toISOString()}`,
    );

    if (expectedStatus === OrderStatus.STOCK_RESERVING) {
      await this.reserveStockStep(orderId, claimId);
    } else if (expectedStatus === OrderStatus.PAYMENT_PROCESSING) {
      await this.processPaymentStep(orderId, claimId);
    }
  }
}
