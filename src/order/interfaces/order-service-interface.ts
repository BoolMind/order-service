import { OrderStatus } from "./order-status.enum";

export interface CreateOrderData {
  userId: number;
  idempotencyKey: string;
  status: OrderStatus;
  totalAmount: string;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  failureReason?: string;
  totalAmount?: string;
}
