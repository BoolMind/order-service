import { GrpcController, ValidateGrpc } from "@ecommerce/common";

import {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderStatusRequest,
  OrderStatusResponse,
  ListOrdersRequest,
  ListOrdersResponse,
} from "@ecommerce/contracts/generated/ecommerce/order/v1/order";

import { OrderMapper } from "./mappers";
import { OrderService } from "./order.service";

@GrpcController("OrderService")
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderMapper: OrderMapper,
  ) {}

  @ValidateGrpc("ecommerce.order.v1.CreateOrderRequest")
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const order = await this.orderService.createOrder(request);

    return this.orderMapper.toCreateOrderResponse(order);
  }

  @ValidateGrpc("ecommerce.order.v1.GetOrderStatusRequest")
  async getOrderStatus(
    request: GetOrderStatusRequest,
  ): Promise<OrderStatusResponse> {
    const order = await this.orderService.findByIdOrFail(request.orderId);

    return this.orderMapper.toOrderStatusResponse(order);
  }

  @ValidateGrpc("ecommerce.order.v1.ListOrdersRequest")
  async listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    const page = request.page || 1;
    const limit = request.limit || 20;

    const result = await this.orderService.listOrders(page, limit);

    return {
      orders: result.data.map((order) =>
        this.orderMapper.toOrderStatusResponse(order),
      ),
      page,
      limit,
      total: result.total,
    };
  }
}
