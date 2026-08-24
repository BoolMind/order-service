import { Injectable } from "@nestjs/common";
import {
  CreateOrderResponse,
  OrderFailureReason as ProtoOrderFailureReason,
  OrderStatus as ProtoOrderStatus,
  OrderStatusResponse,
} from "@ecommerce/contracts/generated/ecommerce/order/v1/order";
import { OrderEntity } from "../entities/order.entity";
import {
  OrderFailureReason,
  OrderStatus,
} from "../interfaces/order-status.enum";
const STATUS_TO_PROTO: Record<OrderStatus, ProtoOrderStatus> = {
  [OrderStatus.PENDING]: ProtoOrderStatus.ORDER_STATUS_PENDING,
  [OrderStatus.STOCK_RESERVING]: ProtoOrderStatus.ORDER_STATUS_PENDING,
  [OrderStatus.STOCK_RESERVED]: ProtoOrderStatus.ORDER_STATUS_STOCK_RESERVED,
  [OrderStatus.PAYMENT_PROCESSING]:
    ProtoOrderStatus.ORDER_STATUS_STOCK_RESERVED,
  [OrderStatus.CONFIRMED]: ProtoOrderStatus.ORDER_STATUS_CONFIRMED,
  [OrderStatus.CANCELLED]: ProtoOrderStatus.ORDER_STATUS_CANCELLED,
};

const FAILURE_REASON_TO_PROTO: Record<
  OrderFailureReason,
  ProtoOrderFailureReason
> = {
  [OrderFailureReason.STOCK_UNAVAILABLE]:
    ProtoOrderFailureReason.ORDER_FAILURE_REASON_STOCK_UNAVAILABLE,
  [OrderFailureReason.PAYMENT_FAILED]:
    ProtoOrderFailureReason.ORDER_FAILURE_REASON_PAYMENT_FAILED,
  [OrderFailureReason.PRODUCT_NOT_FOUND]:
    ProtoOrderFailureReason.ORDER_FAILURE_REASON_PRODUCT_NOT_FOUND,
  [OrderFailureReason.INSUFFICIENT_STOCK]:
    ProtoOrderFailureReason.ORDER_FAILURE_REASON_INSUFFICIENT_STOCK,
};

@Injectable()
export class OrderMapper {
  toCreateOrderResponse(order: OrderEntity): CreateOrderResponse {
    return {
      orderId: order.id,
      status: STATUS_TO_PROTO[order.status],
    };
  }

  toOrderStatusResponse(order: OrderEntity): OrderStatusResponse {
    return {
      orderId: order.id,
      status: STATUS_TO_PROTO[order.status],
      failureReason: order.failureReason
        ? FAILURE_REASON_TO_PROTO[order.failureReason]
        : ProtoOrderFailureReason.ORDER_FAILURE_REASON_UNSPECIFIED,
      totalAmount: order.totalAmount,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      failureDetail: order.failureDetail ?? "",
    };
  }
}
