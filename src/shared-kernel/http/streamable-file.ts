/**
 * Thin replacement for `@nestjs/common`'s `StreamableFile`. Routes that
 * stream binary content (PDF/DOCX exports, OG images) return one of
 * these; the Elysia route mounter recognizes the shape and pipes the
 * underlying buffer/stream into the response with the right headers.
 */

export interface StreamableFileOptions {
  readonly type?: string;
  readonly disposition?: string;
  readonly length?: number;
}

export class StreamableFile {
  readonly options: StreamableFileOptions;
  constructor(
    readonly source: Buffer | Uint8Array | ReadableStream | NodeJS.ReadableStream,
    options: StreamableFileOptions = {},
  ) {
    this.options = options;
  }
}
