import type { PaymentCurrency, RemotePolicy } from '@prisma/client';

/**
 * Parse a comma-separated query param into a typed enum array, dropping
 * empty tokens. Kept outside the controller so the HTTP layer doesn't need
 * to iterate.
 */
export function parseCsvEnum<T extends string>(raw: string | undefined): T[] | undefined {
  if (!raw) return undefined;
  const out: T[] = [];
  for (const part of raw.split(',')) {
    if (part) out.push(part as T);
  }
  return out.length > 0 ? out : undefined;
}

export function parsePaymentCurrencies(raw: string | undefined): PaymentCurrency[] | undefined {
  return parseCsvEnum<PaymentCurrency>(raw);
}

export function parseRemotePolicies(raw: string | undefined): RemotePolicy[] | undefined {
  return parseCsvEnum<RemotePolicy>(raw);
}

export function parseSkillsCsv(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  return raw.split(',');
}
