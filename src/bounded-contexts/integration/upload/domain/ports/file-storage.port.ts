/**
 * Outbound port for the binary blob store. The use cases never see
 * S3, MinIO, or whatever local stub the tests are using — they push
 * bytes through this port and trust the adapter to land them
 * somewhere durable.
 *
 * `uploadFile` returns null when the backend is unreachable; the use
 * case translates that into `UploadStorageUnavailableException`. A
 * thrown error from the adapter is treated as a real failure and
 * bubbles up.
 */

export interface UploadedFileLocation {
  readonly url: string;
  readonly key: string;
}

export abstract class FileStoragePort {
  abstract uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadedFileLocation | null>;

  abstract deleteFile(key: string): Promise<boolean>;
}
