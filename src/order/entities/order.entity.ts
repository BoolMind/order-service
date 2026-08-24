import { Column, Entity, Index, OneToMany, VersionColumn } from "typeorm";

import { AppBaseEntity } from "@ecommerce/common";

import {
  OrderFailureReason,
  OrderStatus,
} from "../interfaces/order-status.enum";

import { OrderItemEntity } from "./order-item.entity";

@Entity("orders")
@Index("IDX_orders_idempotencyKey", ["idempotencyKey"], { unique: true })
export class OrderEntity extends AppBaseEntity {
  @Column({ type: "int" })
  userId!: number;

  @Column({ type: "varchar", length: 36 })
  idempotencyKey!: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: "enum",
    enum: OrderFailureReason,
    nullable: true,
  })
  failureReason?: OrderFailureReason;

  @Column({ type: "varchar", length: 255, nullable: true })
  failureDetail?: string | null;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  totalAmount!: string;

  @VersionColumn()
  version!: number;

  @Column({ type: "varchar", length: 36, nullable: true })
  sagaClaimId?: string | null;

  @Column({ type: "datetime", precision: 6, nullable: true })
  sagaClaimedAt?: Date | null;

  @Index("IDX_orders_sagaLeaseExpiresAt")
  @Column({ type: "datetime", precision: 6, nullable: true })
  sagaLeaseExpiresAt?: Date | null;

  @Column({ type: "int", default: 0 })
  sagaAttempt!: number;

  @OneToMany(() => OrderItemEntity, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items!: OrderItemEntity[];
}
