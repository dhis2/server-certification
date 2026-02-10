import { isDatabaseError } from '../types/errors.types';

export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
} as const;

export function isUniqueViolation(err: unknown): boolean {
  return isDatabaseError(err) && err.code === PG_ERROR_CODES.UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(err: unknown): boolean {
  return (
    isDatabaseError(err) && err.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION
  );
}

export function isNotNullViolation(err: unknown): boolean {
  return isDatabaseError(err) && err.code === PG_ERROR_CODES.NOT_NULL_VIOLATION;
}

export function isCheckViolation(err: unknown): boolean {
  return isDatabaseError(err) && err.code === PG_ERROR_CODES.CHECK_VIOLATION;
}
