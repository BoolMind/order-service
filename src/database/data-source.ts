import "reflect-metadata";
import { config as loadEnv } from "dotenv";
loadEnv();

import { DataSource } from "typeorm";
import { OutboxEntity } from "@ecommerce/common";
import { OrderEntity } from "../order/entities/order.entity";
import { OrderItemEntity } from "../order/entities/order-item.entity";
export default new DataSource({
  type: "mysql",
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "order_db",
  entities: [OrderEntity, OrderItemEntity, OutboxEntity],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
});
