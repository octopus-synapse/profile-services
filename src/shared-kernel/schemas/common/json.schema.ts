/**
 * Shared JSON value schemas without `z.lazy()`.
 *
 * `@asteasolutions/zod-to-openapi` cannot serialise `z.lazy()` without an
 * explicit `.openapi({ refId })` ceremony per node. We sidestep recursion
 * by exposing a primitive union plus a passthrough object/array fallback
 * for the nested cases. OpenAPI consumers see `{}` (any) for the
 * recursive arms — clients pass JSON through unchanged.
 */
import { z } from 'zod';

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const JsonValueSchema = z.union([
  JsonPrimitiveSchema,
  z.array(z.unknown()),
  z.object({}).passthrough(),
]);

export type JsonPrimitive = z.infer<typeof JsonPrimitiveSchema>;
export type JsonValue = JsonPrimitive | unknown[] | Record<string, unknown>;
