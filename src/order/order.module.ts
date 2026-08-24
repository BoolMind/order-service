import {
  Module } from "@nestjs/common";
import { ClientsModule,
  Transport } from "@nestjs/microservices";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { resolve } from "path";
import {
  KafkaModule,
  RabbitMqConfirmPublisherModule,
  RabbitMqModule,
  STOCK_RESERVE_QUEUE,
} from "@ecommerce/common";
import {
  OutboxEntity,
  OutboxService,
} from "@ecommerce/common/persistence";
import { CatalogGrpcClient, UserGrpcClient } from "../grpc";
import { OrderOutboxPublisher, StockPublisher } from "../messaging";
import { OrderEntity, OrderItemEntity } from "./entities";
import { OrderMapper } from "./mappers";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { PaymentService } from "./payment";
import {
  OutboxPollerService,
  OutboxFailureMonitor,
  SagaRecoveryScheduler,
} from "./scheduler";

const contractsPath = require
  .resolve("@ecommerce/contracts/package.json")
  .replace("/package.json", "");

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, OutboxEntity]),
    ScheduleModule.forRoot(),
    RabbitMqModule.registerClient({
      name: "STOCK_SERVICE",
      queue: STOCK_RESERVE_QUEUE,
    }),
    RabbitMqConfirmPublisherModule,
    KafkaModule.registerClient({
      name: "ORDER_EVENTS_PRODUCER",
      clientId: "order-service-producer",
    }),
    ClientsModule.register([
      {
        name: "USER_SERVICE",
        transport: Transport.GRPC,
        options: {
          package: "ecommerce.user.v1",
          protoPath: resolve(
            contractsPath,
            "proto/ecommerce/user/v1/user.proto",
          ),
          loader: {
            longs: Number,
            includeDirs: [
              resolve(contractsPath, "proto"),
              `${contractsPath}/dependencies`,
            ],
          },
          url: `${process.env.USER_GRPC_HOST ?? "localhost"}:${
            process.env.USER_GRPC_PORT ?? 50052
          }`,
        },
      },
      {
        name: "CATALOG_SERVICE",
        transport: Transport.GRPC,
        options: {
          package: "ecommerce.catalog.v1",
          protoPath: resolve(
            contractsPath,
            "proto/ecommerce/catalog/v1/catalog.proto",
          ),
          loader: {
            longs: Number,
            includeDirs: [
              resolve(contractsPath, "proto"),
              `${contractsPath}/dependencies`,
            ],
          },
          url: `${process.env.CATALOG_GRPC_HOST ?? "localhost"}:${
            process.env.CATALOG_GRPC_PORT ?? 50051
          }`,
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderMapper,
    PaymentService,
    StockPublisher,
    OrderOutboxPublisher,
    OutboxPollerService,
    OutboxFailureMonitor,
    SagaRecoveryScheduler,
    OutboxService,
    UserGrpcClient,
    CatalogGrpcClient,
  ],
})
export class OrderModule {}
