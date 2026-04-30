/**
 * Pure wrapper that mirrors the existing `ApiResponseInterceptor` (see
 * `src/shared-kernel/interceptors/api-response.interceptor.ts`).
 * Wraps plain handler output in `{ success: true, data }`. Already-
 * wrapped objects, null/undefined, strings, and `StreamableFile`-shaped
 * payloads pass through.
 *
 * Adapters call this directly when running the framework-free pipeline
 * around a `Route` handler. Nest's interceptor stays in place during
 * the transition; once every BC migrates we'll delete the interceptor.
 */

export function wrapResponse(data: unknown): unknown {
  if (data && typeof data === 'object' && 'success' in (data as object)) return data;
  if (data === undefined || data === null) return data;
  if (typeof data === 'string') return data;
  // Buffer pass-through.
  if (data instanceof Uint8Array) return data;
  // StreamableFile / Buffer / Readable check — duck-typed so this file
  // doesn't import @nestjs. (`null` is already short-circuited above.)
  if (typeof data === 'object') {
    const maybeStream = data as {
      getStream?: () => unknown;
      pipe?: () => unknown;
      source?: unknown;
    };
    if (typeof maybeStream.getStream === 'function' || typeof maybeStream.pipe === 'function') {
      return data;
    }
    // Our `StreamableFile` (src/shared-kernel/http/streamable-file.ts)
    // only carries `source`. Recognize that shape too — otherwise the
    // wrapper turns a binary response into JSON.
    if (
      'source' in maybeStream &&
      (maybeStream.source instanceof Uint8Array ||
        (typeof maybeStream.source === 'object' &&
          maybeStream.source !== null &&
          typeof (maybeStream.source as { pipe?: unknown }).pipe === 'function'))
    ) {
      return data;
    }
  }
  return { success: true, data };
}
