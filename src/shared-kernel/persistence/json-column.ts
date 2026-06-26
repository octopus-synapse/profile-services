/**
 * Typed boundary for Prisma `Json` columns.
 *
 * Prisma types JSON columns as the opaque `JsonValue` union on read and
 * `InputJsonValue` on write, neither of which lines up with the concrete
 * domain shapes a repository deals in. Rather than scatter a double-cast
 * at every query site, the narrowing lives here — once, named, tested.
 *
 * Both helpers take `unknown` so their bodies are a *single* assertion,
 * not the double-cast the `no-unknown-cast` rule forbids.
 */

import type { Prisma } from '@prisma/client';
import type { ZodType } from 'zod';

/**
 * Read a Prisma JSON column into its domain shape.
 *
 * Pass a Zod `schema` to validate at the boundary (recommended when the
 * column may hold untrusted or legacy data — a malformed row throws
 * instead of silently flowing a wrong shape downstream). Omit it to
 * assert the shape when the column is written exclusively by our own
 * controlled code and validation would only add cost.
 */
export function readJsonColumn<T>(value: unknown, schema?: ZodType<T>): T {
  return schema ? schema.parse(value) : (value as T);
}

/**
 * Serialize a domain object to a Prisma JSON input. Domain shapes are
 * frequently `readonly` / mapped types that don't structurally satisfy
 * `InputJsonValue` even though they are valid JSON at runtime; the
 * boundary assertion is contained here.
 */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
