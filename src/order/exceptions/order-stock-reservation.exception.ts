export class OrderStockReservationException extends Error {
  constructor(orderId: number, productId: number) {
    super(
      `Catalog did not return an authoritative price for product ${productId} on order ${orderId}; refusing to trust client-supplied price`,
    );
    this.name = "OrderStockReservationException";
  }
}
