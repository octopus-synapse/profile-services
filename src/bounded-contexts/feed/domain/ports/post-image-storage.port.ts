/**
 * Outbound port for storing post-image binaries. Adapters wrap S3 / MinIO
 * / etc. so the upload use case stays testable.
 */

export interface PostImageUploadResult {
  readonly url: string;
  readonly key: string;
}

export abstract class PostImageStoragePort {
  abstract upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<PostImageUploadResult | null>;
}
