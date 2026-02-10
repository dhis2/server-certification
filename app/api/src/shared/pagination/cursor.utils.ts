export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!decoded || decoded.length === 0) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function isValidCursor(cursor: string): boolean {
  return decodeCursor(cursor) !== null;
}
