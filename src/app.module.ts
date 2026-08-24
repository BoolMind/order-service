import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import {
  appConfig,
  grpcConfig,
  databaseConfig,
  envValidationSchema,
} from "./config";

import { DatabaseModule } from "./database";
import { OrderModule } from "./order/order.module";

import {
  HealthModule,
  LoggerModule,
  GrpcLoggingInterceptor,
  GrpcValidationInterceptor,
  GrpcExceptionFilter,
} from "@ecommerce/common";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, grpcConfig],
      envFilePath: ".env",
      validationSchema: envValidationSchema,
    }),
    LoggerModule,
    DatabaseModule,
    HealthModule,
    OrderModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: GrpcLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: GrpcValidationInterceptor },
    { provide: APP_FILTER, useClass: GrpcExceptionFilter },
  ],
})
export class AppModule {}
