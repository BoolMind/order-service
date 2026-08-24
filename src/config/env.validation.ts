import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  GRPC_URL: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow("").required(),
  DB_NAME: Joi.string().required(),
  RABBITMQ_URL: Joi.string().uri().required(),
  KAFKA_BROKERS: Joi.string().required(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
});
