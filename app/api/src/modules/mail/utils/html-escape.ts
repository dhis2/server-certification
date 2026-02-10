import { escapeUTF8, encodeHTML } from 'entities';

export function escapeHtml(input: string | null | undefined): string {
  if (input == null) {
    return '';
  }

  const str = String(input);
  if (str.length === 0) {
    return '';
  }

  return escapeUTF8(str);
}

export function escapeAttribute(input: string | null | undefined): string {
  if (input == null) {
    return '';
  }

  const str = String(input);
  if (str.length === 0) {
    return '';
  }

  return encodeHTML(str);
}

// Only allows http, https, and mailto protocols
export function escapeUrl(url: string | null | undefined): string {
  if (url == null) {
    return '';
  }

  const str = String(url).trim();
  if (str.length === 0) {
    return '';
  }

  const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];
  try {
    const parsed = new URL(str);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol.toLowerCase())) {
      return '';
    }
  } catch {
    if (!str.startsWith('/')) {
      return '';
    }
  }

  return escapeUTF8(str);
}

export function escapeEmail(email: string | null | undefined): string {
  if (email == null) {
    return '';
  }

  const str = String(email).trim();
  if (str.length === 0) {
    return '';
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(str)) {
    return escapeHtml(str); // Still escape but mark as potentially invalid
  }

  return escapeHtml(str);
}

export function safeMailtoHref(email: string | null | undefined): string {
  const escaped = escapeEmail(email);
  if (!escaped) {
    return '';
  }
  return `mailto:${escaped}`;
}
