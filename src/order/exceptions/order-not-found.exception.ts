import { DomainErrorCode, NotFoundExceptionBase } from "@ecommerce/common";

export class OrderNotFoundException extends NotFoundExceptionBase<DomainErrorCode> {
  constructor(orderId: number) {
    super(DomainErrorCode.NOT_FOUND, `Order ${orderId} was not found.`);
  }
}
