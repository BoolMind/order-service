import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  environment: process.env.NODE_ENV ?? "development",
}));
