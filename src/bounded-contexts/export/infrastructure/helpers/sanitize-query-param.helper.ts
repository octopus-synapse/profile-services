/**
 * Sanitizes query parameters to prevent path traversal and shell injection.
 * Only allows alphanumeric characters, hyphens, underscores, and spaces.
 * Returns undefined if input is empty or contains dangerous characters.
 */
export function sanitizeQueryParam(input: string | undefined): string | undefined {
  if (!input) return undefined;

  if (input.includes('..') || input.includes('/') || input.includes('\\')) {
    return undefined;
  }

  if (/[;|`$(){}]/.test(input)) {
    return undefined;
  }

  const sanitized = input.replace(/[^a-zA-Z0-9\-_ ]/g, '');

  if (sanitized.length < input.length * 0.8) {
    return undefined;
  }

  return sanitized || undefined;
}
