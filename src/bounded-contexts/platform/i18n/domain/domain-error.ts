/**
 * DomainError — parametric domain exception.
 *
 * Every user-facing failure should carry a stable message *code* + structured
 * *params*, not a human string baked into the throw. The frontend gets the
 * translated message via the I18n catalog keyed by `code`.
 *
 * Example:
 *   throw new DomainError({
 *     code: 'EMAIL_IN_USE',
 *     status: 409,
 *     params: { email: dto.email },
 *   });
 *
 * `humanFallback` is optional and only for logs / curl debugging. The
 * response filter replaces it with the translated string before serializing.
 */

import type { TranslationParams } from './translation.port';

export interface DomainErrorProps {
  readonly code: string;
  readonly status: number;
  readonly params?: TranslationParams;
  /** Plain-text English fallback used in logs / stack traces only. */
  readonly humanFallback?: string;
  /** Optional structured field-level errors (Zod, business rules per field). */
  readonly fields?: ReadonlyArray<{
    readonly path: ReadonlyArray<string | number>;
    readonly code: string;
    readonly params?: TranslationParams;
  }>;
}

export class DomainError extends Error {
  /** Every stable code thrown since process start. Drains into
   *  MessageCodeRegistry so catalog parity is verifiable against real
   *  runtime coverage (not just static inventory). */
  private static readonly seenCodes = new Set<string>();

  readonly code: string;
  readonly status: number;
  readonly params: TranslationParams;
  readonly fields: DomainErrorProps['fields'];

  constructor(props: DomainErrorProps) {
    super(props.humanFallback ?? props.code);
    this.name = 'DomainError';
    this.code = props.code;
    this.status = props.status;
    this.params = props.params ?? {};
    this.fields = props.fields;
    DomainError.seenCodes.add(props.code);
    for (const field of props.fields ?? []) DomainError.seenCodes.add(field.code);
    Error.captureStackTrace?.(this, this.constructor);
  }

  static observedCodes(): ReadonlySet<string> {
    return new Set(DomainError.seenCodes);
  }
}

/**
 * Type guard — preferred over instanceof checks so downstream modules can
 * depend on the shape without importing the class directly.
 */
export function isDomainError(err: unknown): err is DomainError {
  return (
    err instanceof Error &&
    (err as { code?: unknown }).code !== undefined &&
    typeof (err as { status?: unknown }).status === 'number' &&
    (err as { name?: unknown }).name === 'DomainError'
  );
}
