import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { AppBaseEntity } from "@ecommerce/common";

import { OrderEntity } from "./order.entity";

@Entity("order_items")
export class OrderItemEntity extends AppBaseEntity {
  @Column({ type: "int" })
  orderId!: number;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order!: OrderEntity;

  @Column({ type: "int" })
  productId!: number;

  @Column({ type: "int" })
  quantity!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  unitPrice!: string;
}
