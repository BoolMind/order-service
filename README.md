# Order Service

The Order Service manages order creation, retrieval, updates, cancellation, and order lifecycle operations for the Ecommerce microservices system.

It exposes gRPC APIs and communicates with other microservices through Protocol Buffer contracts and messaging infrastructure.

## Responsibilities

- Create and manage orders
- Retrieve orders by ID
- Paginate orders
- Update order status
- Cancel orders
- Validate incoming gRPC requests
- Persist order data using TypeORM
- Communicate with the User Service through gRPC
- Publish order lifecycle events
- Handle order-related domain errors
- Provide centralized exception handling
- Provide logging and distributed tracing
- Provide health monitoring

## Project Structure

```text
order-service/
├── src/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── env.validation.ts
│   │   ├── grpc.config.ts
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── index.ts
│   │   └── order.constants.ts
│   │
│   ├── database/
│   │   ├── data-source.ts
│   │   ├── database.module.ts
│   │   └── index.ts
│   │
│   ├── grpc/
│   │   ├── index.ts
│   │   └── user.grpc.client.ts
│   │
│   ├── messaging/
│   │   └── index.ts
│   │
│   ├── order/
│   │   ├── index.ts
│   │   ├── order.controller.ts
│   │   ├── order.module.ts
│   │   └── order.service.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

## Order Management

The Order Service provides functionality for managing the order lifecycle.

Order operations include:

- Create orders
- Retrieve orders
- Retrieve an order by ID
- Update orders
- Cancel orders
- Paginate orders
- Manage order status

Order-related business logic is implemented in:

```text
src/order/order.service.ts
```

The gRPC endpoints are implemented in:

```text
src/order/order.controller.ts
```

## Order Lifecycle

The service manages order state transitions according to the order domain rules.

Order status handling is centralized through the order constants:

```text
src/constants/order.constants.ts
```

The service validates state transitions before applying changes to an order.

## Database

The Order Service uses TypeORM for database access.

Database configuration is located under:

```text
src/config/
```

Database-related functionality is located under:

```text
src/database/
```

The service uses TypeORM entities and migrations to manage the order database schema.

## gRPC API

The Order Service exposes gRPC endpoints defined by the contracts in `ecommerce-contracts`.

The gRPC service is configured during application bootstrap in:

```text
src/main.ts
```

The service loads the Order and Common Protocol Buffer definitions from `@ecommerce/contracts`.

## User Service Communication

The Order Service communicates with the User Service through gRPC.

The User Service client is located under:

```text
src/grpc/user.grpc.client.ts
```

This allows the Order Service to perform required user-related operations without directly accessing the User Service database.

## Messaging

The Order Service contains messaging integration for publishing order-related events.

Messaging-related code is located under:

```text
src/messaging/
```

Order lifecycle events can be consumed by other services without creating direct service-to-service dependencies.

## Validation

Incoming gRPC requests are validated using the shared validation infrastructure provided by `@ecommerce/common`.

The service uses:

- gRPC validation interceptors
- Protocol Buffer validation
- Request validation
- Domain-level validation

Invalid requests are rejected before reaching the business logic.

## Error Handling

The Order Service uses centralized gRPC exception handling provided by `@ecommerce/common`.

Order-specific errors are handled at the service/domain level and converted into appropriate gRPC errors.

The service avoids exposing internal database or implementation errors directly to clients.

## Health Checks

The service includes the shared health module provided by `@ecommerce/common`.

Health checks are used to monitor the availability of the service and its required infrastructure.

## Logging

The Order Service uses the shared application logger provided by `@ecommerce/common`.

The logger is configured during application bootstrap.

## Tracing

Distributed tracing is initialized during application startup.

The service name is configured through the `SERVICE_NAME` environment variable.

Tracing allows requests to be correlated across the API Gateway and backend microservices.

## Configuration

Configuration is handled through NestJS `ConfigModule`.

Configuration files are located under:

```text
src/config/
```

The service configuration includes:

- Application configuration
- Database configuration
- gRPC configuration
- Environment validation

Create a local `.env` file using `.env.example` as a reference.

Do not commit secrets or actual environment values.

## Installation

Install dependencies:

```bash
npm install
```

## Development

Start the service in development mode:

```bash
npm run start:dev
```

## Build

Build the application:

```bash
npm run build
```

## Production

Start the compiled application:

```bash
npm run start:prod
```

## Type Checking

Run TypeScript type checking without emitting files:

```bash
npx tsc --noEmit
```

## Formatting

Format the source code using Prettier:

```bash
npx prettier --write src
```

## Docker

The repository contains Docker configuration for running the Order Service.

Build the Docker image:

```bash
docker build -t order-service .
```

The repository also contains:

```text
docker-compose.yml
```

for local container-based development.

## Environment

Use `.env.example` as the reference for local environment configuration.

Actual `.env` files and secrets should remain local and are excluded through `.gitignore`.

## Shared Components

### `@ecommerce/common`

Provides shared infrastructure and reusable functionality across the microservices system, including:

- Logging
- Exception handling
- gRPC utilities
- Health checks
- Interceptors
- Messaging utilities
- Distributed tracing
- Shared DTOs and interfaces

### `@ecommerce/contracts`

Provides the Protocol Buffer contracts used for gRPC communication between services.

The Order Service uses these contracts for its gRPC API and communication with other microservices.