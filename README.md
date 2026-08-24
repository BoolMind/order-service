# Order Service

The **Order Service** is a NestJS microservice responsible for creating and managing orders in the Ecommerce microservices system.

It exposes gRPC APIs, communicates with the User and Catalog services through gRPC, persists order data using TypeORM, publishes order events through Kafka using the Outbox Pattern, and communicates with stock-related workflows through RabbitMQ.

The service also implements saga-based order processing, outbox polling, failure monitoring, and saga recovery to improve reliability across distributed operations.

## Responsibilities

* Create orders
* Retrieve orders
* Retrieve orders by ID
* Update orders
* Cancel orders
* Manage order status
* Paginate orders
* Validate incoming gRPC requests
* Persist orders and order items using TypeORM
* Communicate with the User Service through gRPC
* Communicate with the Catalog Service through gRPC
* Publish order events through Kafka
* Publish stock-related messages through RabbitMQ
* Implement the Outbox Pattern for reliable event publishing
* Coordinate distributed order processing through saga workflows
* Monitor failed outbox events
* Recover interrupted saga operations
* Handle stock reservation failures
* Handle order-specific domain and validation errors
* Provide centralized exception handling
* Provide logging and distributed tracing
* Provide health monitoring

---

## Architecture

The Order Service participates in both synchronous and asynchronous communication.

```text
                           ┌─────────────────┐
                           │   API Gateway   │
                           └────────┬────────┘
                                    │
                                   gRPC
                                    │
                                    ▼
                           ┌─────────────────┐
                           │  Order Service  │
                           └────┬─────┬────┬─┘
                                │     │    │
                     gRPC       │     │    │ Messaging
                                │     │    │
                    ┌───────────┘     │    └──────────────┐
                    ▼                 │                   ▼
             ┌─────────────┐         │             ┌───────────┐
             │ User Service│         │             │ RabbitMQ  │
             └─────────────┘         │             └─────┬─────┘
                                     │                   │
                              ┌──────▼──────┐            ▼
                              │   Catalog   │      Stock Workflow
                              │   Service   │
                              └─────────────┘

                           Order Events
                                │
                                ▼
                              Kafka
                                │
                                ▼
                         Event Consumers
```

The Order Service uses:

* **gRPC** for synchronous communication with other services
* **Kafka** for publishing order-related events
* **RabbitMQ** for stock-related messaging
* **TypeORM** for order persistence
* **Saga workflows** for distributed order processing
* **Outbox Pattern** for reliable event publishing

---

## Project Structure

```text
order-service/
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── package.json
├── package-lock.json
├── README.md
│
├── src/
│   ├── app.module.ts
│   │
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
│   │   ├── database.module.ts
│   │   ├── data-source.ts
│   │   ├── index.ts
│   │   └── migrations/
│   │       ├── 1787156134647-AddSagaLeaseToOrders.ts
│   │       └── 1787313341403-AddStockFailureReasons.ts
│   │
│   ├── grpc/
│   │   ├── catalog.grpc.client.ts
│   │   ├── index.ts
│   │   └── user.grpc.client.ts
│   │
│   ├── messaging/
│   │   ├── index.ts
│   │   ├── kafka/
│   │   │   ├── index.ts
│   │   │   └── order-outbox.publisher.ts
│   │   └── rabbitmq/
│   │       ├── index.ts
│   │       └── stock.publisher.ts
│   │
│   ├── order/
│   │   ├── constants/
│   │   │   ├── index.ts
│   │   │   └── order.constants.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── index.ts
│   │   │   ├── order.entity.ts
│   │   │   └── order-item.entity.ts
│   │   │
│   │   ├── exceptions/
│   │   │   ├── index.ts
│   │   │   ├── order-not-found.exception.ts
│   │   │   ├── order-stock-reservation.exception.ts
│   │   │   └── order-validation.exception.ts
│   │   │
│   │   ├── interfaces/
│   │   │   ├── index.ts
│   │   │   ├── order-service-interface.ts
│   │   │   └── order-status.enum.ts
│   │   │
│   │   ├── mappers/
│   │   │   ├── index.ts
│   │   │   └── order.mapper.ts
│   │   │
│   │   ├── payment/
│   │   │   ├── index.ts
│   │   │   └── payment.service.ts
│   │   │
│   │   ├── scheduler/
│   │   │   ├── index.ts
│   │   │   ├── outbox-failure-monitor.scheduler.ts
│   │   │   ├── outbox-poller.service.ts
│   │   │   └── saga-recovery.scheduler.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── db-error.util.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── index.ts
│   │   ├── order.controller.ts
│   │   ├── order.module.ts
│   │   └── order.service.ts
│   │
│   └── main.ts
│
├── tsconfig.build.json
└── tsconfig.json
```

---

# Order Management

The Order Service manages the core order operations of the Ecommerce system.

Supported operations include:

* Create an order
* Retrieve orders
* Retrieve an order by ID
* Update an order
* Cancel an order
* Update order status
* Paginate orders

The main business logic is implemented in:

```text
src/order/order.service.ts
```

The gRPC controller is implemented in:

```text
src/order/order.controller.ts
```

---

# Order Entities

Order persistence is represented through dedicated TypeORM entities.

```text
src/order/entities/
├── order.entity.ts
└── order-item.entity.ts
```

The `Order` entity represents the order itself, while `OrderItem` represents the individual products included in an order.

The service maintains ownership of its order data and does not directly access databases belonging to other microservices.

---

# Order Status

Order status handling is centralized through the order status definitions.

```text
src/order/interfaces/order-status.enum.ts
```

Additional order constants are maintained under:

```text
src/order/constants/
```

The service validates order state changes before applying updates.

This keeps order state transitions consistent with the business rules implemented by the service.

---

# gRPC API

The Order Service exposes gRPC endpoints defined by the shared Protocol Buffer contracts provided by:

```text
@ecommerce/contracts
```

The gRPC server is configured during application bootstrap in:

```text
src/main.ts
```

The service uses the shared Order and Common protobuf definitions for its external service interface.

Incoming gRPC requests are validated before reaching the order business logic.

---

# User Service Communication

The Order Service communicates with the User Service through gRPC.

The User Service client is located at:

```text
src/grpc/user.grpc.client.ts
```

The Order Service uses this client when it requires user-related information or operations.

The Order Service does not directly access the User Service database.

---

# Catalog Service Communication

The Order Service also communicates with the Catalog Service through gRPC.

The Catalog Service client is located at:

```text
src/grpc/catalog.grpc.client.ts
```

This allows the Order Service to obtain required catalog/product information through the Catalog Service API while maintaining service ownership boundaries.

---

# Kafka Messaging

The Order Service publishes order-related events through Kafka.

Kafka-related code is located under:

```text
src/messaging/kafka/
```

The main publisher is:

```text
src/messaging/kafka/order-outbox.publisher.ts
```

The Order Service uses Kafka for asynchronous order event publishing.

A simplified flow is:

```text
Order Service
     │
     │ Order Event
     ▼
   Outbox
     │
     │ Outbox Poller
     ▼
   Kafka
     │
     ├──────────────► Notification Service
     │
     └──────────────► Other Consumers
```

The Order Service acts as a **Kafka event producer**. Event consumers are responsible for reacting to the published events.

---

# Outbox Pattern

The Order Service uses the **Transactional Outbox Pattern** to improve reliability when publishing order events.

Instead of relying on a direct database operation followed by an independent message publication, order-related events can be persisted as part of the service's persistence workflow and published through the outbox mechanism.

The relevant messaging implementation is:

```text
src/messaging/kafka/order-outbox.publisher.ts
```

The outbox processing functionality is located under:

```text
src/order/scheduler/
```

including:

```text
outbox-poller.service.ts
outbox-failure-monitor.scheduler.ts
```

This helps prevent situations where an order is successfully persisted but its corresponding event is lost because message publishing failed.

---

# Outbox Polling

The Order Service includes an outbox polling mechanism:

```text
src/order/scheduler/outbox-poller.service.ts
```

The poller checks pending outbox records and processes them for event publication.

This allows event publishing to be retried independently from the original order request.

---

# Outbox Failure Monitoring

Failed outbox processing is monitored by:

```text
src/order/scheduler/outbox-failure-monitor.scheduler.ts
```

This provides a mechanism for detecting failed or problematic event publishing attempts.

The goal is to make messaging failures observable and recoverable rather than silently losing order events.

---

# RabbitMQ Messaging

The Order Service also publishes stock-related messages through RabbitMQ.

RabbitMQ-related code is located under:

```text
src/messaging/rabbitmq/
```

The stock publisher is:

```text
src/messaging/rabbitmq/stock.publisher.ts
```

RabbitMQ is used for stock-related communication during order processing.

A simplified flow is:

```text
Order Service
     │
     │ Stock Reservation Message
     ▼
 RabbitMQ
     │
     ▼
Stock-related Service
```

The Order Service acts as a **RabbitMQ message publisher** for this workflow.

---

# Saga Processing

Order processing may involve multiple distributed operations across services.

The Order Service includes saga-related recovery functionality to handle interrupted or incomplete distributed workflows.

Saga-related scheduling is implemented in:

```text
src/order/scheduler/saga-recovery.scheduler.ts
```

The database also contains saga-related migration support:

```text
src/database/migrations/1787156134647-AddSagaLeaseToOrders.ts
```

The saga lease mechanism helps coordinate recovery of orders whose distributed workflow may have been interrupted.

---

# Saga Recovery

The service includes scheduled recovery for incomplete saga operations.

```text
src/order/scheduler/saga-recovery.scheduler.ts
```

The recovery mechanism allows the service to detect and process orders that may have been left in an intermediate state.

This is important in a distributed system where failures can occur between service-to-service operations.

---

# Stock Reservation

Stock-related order processing is handled through RabbitMQ messaging.

The service contains a dedicated exception for stock reservation failures:

```text
src/order/exceptions/order-stock-reservation.exception.ts
```

Stock failure information is also supported by the database migration:

```text
src/database/migrations/1787313341403-AddStockFailureReasons.ts
```

This allows stock reservation failures to be represented as part of the order processing workflow.

---

# Payment

Payment-related functionality is encapsulated in:

```text
src/order/payment/payment.service.ts
```

Keeping payment-related logic within a dedicated service class separates it from the main order service implementation and makes the order processing workflow easier to maintain.

---

# Database

The Order Service uses **TypeORM** for database access.

Database configuration is located under:

```text
src/config/database.config.ts
```

Database initialization and module configuration are located under:

```text
src/database/
```

The service uses TypeORM entities and migrations to manage the order database schema.

Current migrations include:

```text
1787156134647-AddSagaLeaseToOrders.ts
1787313341403-AddStockFailureReasons.ts
```

---

# Validation

Incoming gRPC requests are validated using the shared validation infrastructure provided by:

```text
@ecommerce/common
```

Validation can occur at multiple levels:

* Protocol Buffer validation
* gRPC request validation
* Request/DTO validation
* Domain-level validation
* Order-specific business validation

Order-specific validation errors are represented through:

```text
src/order/exceptions/order-validation.exception.ts
```

---

# Error Handling

The Order Service provides dedicated exceptions for common order-related failures.

These are located under:

```text
src/order/exceptions/
```

Current exceptions include:

```text
order-not-found.exception.ts
order-stock-reservation.exception.ts
order-validation.exception.ts
```

Shared exception handling infrastructure is provided by:

```text
@ecommerce/common
```

The service converts domain-specific failures into appropriate transport-level errors without exposing internal implementation details to clients.

---

# Mappers

Order response and transformation logic is centralized through the order mapper:

```text
src/order/mappers/order.mapper.ts
```

This keeps transport and persistence transformations separate from the core business logic.

---

# Configuration

Configuration is handled through NestJS `ConfigModule`.

Configuration files are located under:

```text
src/config/
```

The configuration layer includes:

* Application configuration
* Database configuration
* gRPC configuration
* Environment validation

Environment variables are validated through:

```text
src/config/env.validation.ts
```

Create a local `.env` file using `.env.example` as a reference.

Do not commit secrets or actual environment values.

---

# Logging

The Order Service uses shared logging infrastructure provided by:

```text
@ecommerce/common
```

Logging is initialized during application startup and provides consistent service-level logging across the Ecommerce microservices.

---

# Distributed Tracing

Distributed tracing is initialized during application startup.

The service uses its configured service name so requests can be correlated across the Ecommerce microservices.

Tracing is particularly useful for following a request across:

```text
API Gateway
     ↓
Order Service
     ↓
User / Catalog Services
     ↓
Kafka / RabbitMQ
```

---

# Health Monitoring

The service includes health monitoring through the shared infrastructure provided by:

```text
@ecommerce/common
```

Health checks allow the availability of the service and its required infrastructure to be monitored.

---

# Shared Packages

## `@ecommerce/common`

The Order Service uses the shared common package for reusable infrastructure and cross-cutting functionality.

It provides functionality including:

* gRPC utilities
* Validation
* Exception handling
* Logging
* Health checks
* Messaging utilities
* Distributed tracing
* Pagination
* Shared infrastructure
* Persistence abstractions

General shared functionality is imported from:

```typescript
import { ... } from '@ecommerce/common';
```

Persistence-specific functionality is exposed through:

```typescript
import { ... } from '@ecommerce/common/persistence';
```

---

## `@ecommerce/contracts`

The Order Service uses the shared Protocol Buffer and event contracts provided by:

```text
@ecommerce/contracts
```

These contracts define the interfaces used for:

* Order gRPC APIs
* Common protobuf messages
* User Service communication
* Catalog Service communication
* Order events
* Shared event structures

Using shared contracts keeps communication between microservices consistent.

---

# Installation

Install project dependencies:

```bash
npm install
```

---

# Development

Start the service in development mode:

```bash
npm run start:dev
```

---

# Build

Build the application:

```bash
npm run build
```

---

# Production

Start the compiled application:

```bash
npm run start:prod
```

---

# Type Checking

Run TypeScript type checking without emitting files:

```bash
npx tsc --noEmit
```

---

# Formatting

Format the source code using Prettier:

```bash
npx prettier --write src
```

---

# Docker

The repository contains a Dockerfile for containerizing the Order Service.

Build the Docker image:

```bash
docker build -t order-service .
```

The repository also contains:

```text
docker-compose.yml
```

for local container-based development.

The shared Kafka and RabbitMQ infrastructure for the overall Ecommerce system is maintained separately in:

```text
ecommerce-infra
```

---

# Environment

Use `.env.example` as the reference for local environment configuration.

Create a local `.env` file:

```bash
cp .env.example .env
```

Actual environment files and secrets should remain local and are excluded through `.gitignore`.

---

# Technology Stack

* **Node.js**
* **TypeScript**
* **NestJS**
* **gRPC**
* **Protocol Buffers**
* **Kafka**
* **RabbitMQ**
* **TypeORM**
* **Docker**
* **npm**

---

# Related Repositories

The Order Service is part of the Ecommerce microservices system.

Related repositories include:

* `ecommerce-common` — shared infrastructure and utilities
* `ecommerce-contracts` — shared Protocol Buffer and event contracts
* `api-gateway` — external API entry point
* `user-service` — user management
* `catalog-service` — product and category management
* `notification-service` — event-driven notification handling
* `ecommerce-infra` — Kafka and RabbitMQ infrastructure

---

# Architecture Principles

The Order Service follows the following microservices principles:

### Service Ownership

The Order Service owns order-related business logic and order data.

### Database Isolation

The service does not directly access databases owned by other microservices.

### Contract-Based Communication

gRPC and event communication use shared Protocol Buffer contracts.

### Synchronous Communication

gRPC is used when the Order Service requires an immediate response from another service.

### Asynchronous Communication

Kafka and RabbitMQ are used for asynchronous messaging workflows.

### Reliable Event Publishing

The Outbox Pattern is used to improve reliability when publishing order events.

### Distributed Workflow Recovery

Saga recovery mechanisms are used to handle interrupted distributed order workflows.

### Shared Infrastructure

Cross-cutting functionality such as validation, logging, tracing, health checks, and messaging utilities is provided through `@ecommerce/common`.

---

# License

This project is private and intended for use within the Ecommerce microservices system.

```text
UNLICENSED
```
