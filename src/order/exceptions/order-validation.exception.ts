import { DomainErrorCode, ValidationExceptionBase } from "@ecommerce/common";

export class OrderValidationException extends ValidationExceptionBase<DomainErrorCode> {
  constructor(message: string) {
    super(DomainErrorCode.VALIDATION_ERROR, message);
  }
}
