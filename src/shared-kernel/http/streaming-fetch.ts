/**
 * Capped streaming-body reader (P1 #45, #46, #51).
 *
 * Reads a `ReadableStream<Uint8Array>` chunk-by-chunk, accumulating into
 * a single `Buffer` while enforcing a hard byte cap. The stream is
 * cancelled the moment the threshold is crossed so the producer
 * (multipart upload, outbound HTTP response, etc.) doesn't keep pushing
 * bytes we will never use.
 *
 * Two paths use this:
 *
 *   - `SafeFetchStrictAdapter.requestWithIpBind` — caps the body of
 *     outbound webhook responses so a hostile target cannot OOM us by
 *     returning a multi-GB blob.
 *   - `parseMultipart` — caps user uploads (resume PDF, post image)
 *     even when the client lies about `Content-Length`.
 *
 * Throws `BodyTooLargeException` on overflow. The exception carries
 * the configured cap (`maxBytes`) and the highwater observed (`seen`)
 * so the error log identifies the policy that fired.
 */

export class BodyTooLargeException extends Error {
  constructor(
    public readonly maxBytes: number,
    public readonly seen: number,
  ) {
    super(`Response body exceeded the ${maxBytes}-byte cap (observed >= ${seen})`);
    this.name = 'BodyTooLargeException';
  }
}

export const DEFAULT_BODY_CAP_BYTES = 1_048_576; // 1 MB

export async function readBodyCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number = DEFAULT_BODY_CAP_BYTES,
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel(new BodyTooLargeException(maxBytes, total));
        } catch {
          // cancel is best-effort — the producer may already be gone
        }
        throw new BodyTooLargeException(maxBytes, total);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // releaseLock after cancel can throw — safe to swallow
    }
  }
  return Buffer.concat(chunks);
}
