/**
 * Multipart parsing bridge for Elysia. When a `Route.kind === 'multipart'`
 * route is mounted, the route mounter calls `parseMultipart(req)` which
 * returns the normalized `MultipartBody` shape used by upload handlers
 * (post images, resume import, etc.).
 *
 * Strategy: prefer Bun's native `request.formData()` parsing — it covers
 * standard multipart/form-data without extra deps. Fallback to `busboy`
 * for edge cases (chunked uploads, very large streams) is invoked only
 * when the native path can't materialize a `File`.
 *
 * P1 #51 — body-size enforcement runs in two stages:
 *
 *   1. **Header pre-check.** If the client advertises a
 *      `Content-Length` larger than `maxBytes`, reject with
 *      `PayloadTooLargeException` *before* materializing the body so
 *      a 5 GB upload doesn't even touch the process memory.
 *   2. **Stream cap.** Clients can lie about Content-Length (or
 *      stream a chunked body without it). Pipe the body through
 *      `readBodyCapped` so the second barrier still trips, this
 *      time as `BodyTooLargeException` from the streaming-fetch
 *      helper.
 */

import { type BodyTooLargeException, readBodyCapped } from '@/shared-kernel/http/streaming-fetch';

export interface MultipartFile {
  readonly fieldName: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface MultipartBody {
  readonly files: ReadonlyArray<MultipartFile>;
  readonly fields: Readonly<Record<string, string>>;
}

interface FileLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isFileLike(value: unknown): value is FileLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FileLike).arrayBuffer === 'function' &&
    typeof (value as FileLike).name === 'string' &&
    typeof (value as FileLike).size === 'number'
  );
}

export class PayloadTooLargeException extends Error {
  readonly statusCode = 413;
  readonly errorCode = 'PAYLOAD_TOO_LARGE';
  constructor(
    public readonly maxBytes: number,
    public readonly declaredBytes?: number,
  ) {
    super(
      declaredBytes !== undefined
        ? `Multipart payload (${declaredBytes} bytes declared) exceeds the ${maxBytes}-byte cap`
        : `Multipart payload exceeds the ${maxBytes}-byte cap`,
    );
    this.name = 'PayloadTooLargeException';
  }
}

export interface ParseMultipartOptions {
  /** Hard cap on the total request body. Default 25 MB. */
  readonly maxBytes?: number;
}

const DEFAULT_MAX_MULTIPART_BYTES = 25 * 1024 * 1024;

export async function parseMultipart(
  request: Request,
  options: ParseMultipartOptions = {},
): Promise<MultipartBody> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_MULTIPART_BYTES;

  // (1) Header pre-check — refuse before we ever touch the body.
  const declaredRaw = request.headers.get('content-length');
  if (declaredRaw !== null) {
    const declared = Number(declaredRaw);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PayloadTooLargeException(maxBytes, declared);
    }
  }

  // (2) Stream-side cap — guards against a lying Content-Length and
  // chunked uploads. We re-pack the capped body into a fresh `Request`
  // so `formData()` sees a body it can parse normally.
  const cappedRequest = await capRequestBody(request, maxBytes);

  const form = await cappedRequest.formData();
  const files: MultipartFile[] = [];
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (isFileLike(value)) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        fieldName: key,
        filename: value.name,
        mimeType: value.type || 'application/octet-stream',
        size: value.size,
        buffer,
      });
    } else if (typeof value === 'string') {
      fields[key] = value;
    }
  }
  return { files, fields };
}

async function capRequestBody(request: Request, maxBytes: number): Promise<Request> {
  if (request.body === null) return request;
  let capped: Buffer;
  try {
    capped = await readBodyCapped(request.body, maxBytes);
  } catch (err) {
    if ((err as BodyTooLargeException).name === 'BodyTooLargeException') {
      throw new PayloadTooLargeException(maxBytes);
    }
    throw err;
  }
  // Construct the fresh body as a Blob — Bun's `Request` accepts every
  // BodyInit member, but `Uint8Array<ArrayBufferLike>` is sometimes
  // narrowed incompatibly by TS's lib.dom typings. Blob is portable.
  // Copy to a fresh ArrayBuffer so the Blob ctor's `BlobPart` slot is
  // happy regardless of whether the underlying buffer is shared.
  const ab = new ArrayBuffer(capped.byteLength);
  new Uint8Array(ab).set(capped);
  const body = new Blob([ab]);
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
}
