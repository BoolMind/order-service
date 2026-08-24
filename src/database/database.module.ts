import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxEntity } from "@ecommerce/common";
import { OrderEntity } from "../order/entities/order.entity";
import { OrderItemEntity } from "../order/entities/order-item.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql" as const,
        host: config.get<string>("database.host"),
        port: config.get<number>("database.port"),
        username: config.get<string>("database.username"),
        password: config.get<string>("database.password"),
        database: config.get<string>("database.name"),
        entities: [OrderEntity, OrderItemEntity, OutboxEntity],
        migrations: [__dirname + "/migrations/*{.ts,.js}"],
        migrationsRun: true,
        synchronize: false,
        logging: config.get<string>("app.environment") === "development",
      }),
    }),
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, OutboxEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
