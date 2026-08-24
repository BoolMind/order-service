interface MysqlDriverError {
  code?: string;
  errno?: number;
}

export function isDuplicateKeyError(error: unknown): boolean {
  const driverError = (error as { driverError?: MysqlDriverError })
    ?.driverError;
  return driverError?.code === "ER_DUP_ENTRY" || driverError?.errno === 1062;
}
