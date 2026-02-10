export interface DatabaseError extends Error {
  code: string;
  detail?: string;
  constraint?: string;
}

export function isDatabaseError(err: unknown): err is DatabaseError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as DatabaseError).code === 'string'
  );
}
