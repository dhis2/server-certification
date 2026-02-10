export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal =
    local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
  return `${maskedLocal}@${domain}`;
}

export function maskUuid(uuid: string): string {
  if (uuid.length < 8) return '***';
  return `${uuid.substring(0, 5)}***${uuid.substring(uuid.length - 4)}`;
}
