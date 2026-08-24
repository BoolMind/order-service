import { registerAs } from "@nestjs/config";

export const grpcConfig = registerAs("grpc", () => ({
  url: process.env.GRPC_URL ?? "0.0.0.0:5001",
}));
