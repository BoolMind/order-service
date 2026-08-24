import "dotenv/config";
import { initTracing } from "@ecommerce/common";
initTracing("order-service");

import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import { AppModule } from "./app.module";
import { grpcConfig } from "./config";
import { AppLogger } from "@ecommerce/common";

const contractsPath = require
  .resolve("@ecommerce/contracts/package.json")
  .replace("/package.json", "");

async function bootstrap() {
  const config = grpcConfig();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ["ecommerce.order.v1", "ecommerce.common.v1"],
        protoPath: [
          join(contractsPath, "proto/ecommerce/order/v1/order.proto"),
          join(contractsPath, "proto/ecommerce/common/v1/health.proto"),
        ],
        loader: {
          longs: Number,
          includeDirs: [
            join(contractsPath, "proto"),
            join(contractsPath, "dependencies"),
          ],
        },
        url: config.url,
      },
    },
  );

  app.useLogger(app.get(AppLogger));
  app.enableShutdownHooks();
  await app.listen();
  app.get(AppLogger).log(`Order Service gRPC listening on ${config.url}`);
}

bootstrap();
