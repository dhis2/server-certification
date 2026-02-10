// Escapes LIKE special characters (%, _, \) to prevent LIKE pattern injection
// @see https://owasp.org/www-community/attacks/SQL_Injection

import { PAGINATION_DEFAULTS } from './pagination.types';

const LIKE_SPECIAL_CHARS = /[%_\\]/g;

export function sanitizeSearch(
  search: string,
  maxLength: number = PAGINATION_DEFAULTS.MAX_SEARCH_LENGTH,
): string {
  return search.trim().slice(0, maxLength).replace(LIKE_SPECIAL_CHARS, '\\$&');
}

export function createLikePattern(search: string): string {
  return `%${sanitizeSearch(search)}%`;
}

export function isEmptySearch(search: string | undefined | null): boolean {
  if (!search) return true;
  return search.trim().length === 0;
}
